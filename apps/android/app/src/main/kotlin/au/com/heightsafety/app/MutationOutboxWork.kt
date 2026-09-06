package au.com.heightsafety.app

import android.content.Context
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.CoroutineWorker
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.WorkManager
import androidx.work.WorkerParameters
import au.com.heightsafety.api.apis.SynchronisationApi
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.MutationOutboxDrainer
import au.com.heightsafety.domain.SyncMutationDelivery
import au.com.heightsafety.domain.SyncMutationTransport
import kotlinx.coroutines.CancellationException
import java.util.concurrent.TimeUnit

public object MutationOutboxWork {
    public const val UNIQUE_WORK_NAME: String = "height-safety-mutation-outbox"

    @Volatile
    private var activeSession: FieldSession? = null

    public fun enqueue(context: Context) {
        enqueueInternal(context)
    }

    public fun enqueue(context: Context, session: FieldSession) {
        activeSession = session
        enqueueInternal(context)
    }

    public fun clearSession() {
        activeSession = null
    }

    private fun enqueueInternal(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            UNIQUE_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<MutationOutboxWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build(),
        )
    }

    internal fun sessionForWorker(): FieldSession? = activeSession
}

public class MutationOutboxWorker internal constructor(
    appContext: Context,
    workerParams: WorkerParameters,
    private val drainer: MutationOutboxDrainer,
) : CoroutineWorker(appContext, workerParams) {
    public constructor(
        appContext: Context,
        workerParams: WorkerParameters,
    ) : this(appContext, workerParams, defaultMutationOutboxDrainer(appContext))

    override suspend fun doWork(): Result = try {
        if (drainer.drain().requiresRetry) {
            Result.retry()
        } else {
            Result.success()
        }
    } catch (error: CancellationException) {
        throw error
    } catch (_: Exception) {
        // Next run recovers any synchronising item before retrying it.
        Result.retry()
    }
}

private fun defaultMutationOutboxDrainer(context: Context): MutationOutboxDrainer =
    MutationOutboxWork.sessionForWorker().let { session ->
        val store = EncryptedJobPackStore(context.applicationContext)
        val apiClient = session?.let {
            ApiClient(
                baseUrl = context.getString(R.string.api_base_url),
                authNames = arrayOf("access-token"),
            )
        }
        val transport = when {
            session == null -> UnconfiguredMutationTransport
            session?.isExpired(System.currentTimeMillis()) == true ->
                SessionExpiredMutationTransport
            else -> {
                val authenticatedSession = session
                    ?: error("authenticated worker session disappeared")
                val authenticatedApiClient = apiClient
                    ?: error("authenticated worker API client is unavailable")
                OpenApiSyncMutationTransport(
                    synchronisationApi = authenticatedApiClient
                        .createService(SynchronisationApi::class.java),
                    session = authenticatedSession,
                    bearerTokenSink = authenticatedApiClient::setBearerToken,
                )
            }
        }
        MutationOutboxDrainer(
            store = store,
            transport = transport,
            nowEpochMillis = { System.currentTimeMillis() },
            companyId = session?.companyId,
        )
    }

private object UnconfiguredMutationTransport : SyncMutationTransport {
    override suspend fun send(mutation: au.com.heightsafety.domain.SyncMutation): SyncMutationDelivery =
        SyncMutationDelivery.PermanentFailure(
            "Mutation synchronisation transport is not configured.",
        )
}

private object SessionExpiredMutationTransport : SyncMutationTransport {
    override suspend fun send(mutation: au.com.heightsafety.domain.SyncMutation): SyncMutationDelivery =
        SyncMutationDelivery.PermanentFailure(
            "Active field session is expired; sign in again before synchronising.",
        )
}
