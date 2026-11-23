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
import au.com.heightsafety.data.EncryptedJobPackStore
import au.com.heightsafety.data.LocalAnchorPhotoStorage
import au.com.heightsafety.data.LocalAnchorPhotoUploadContentSource
import au.com.heightsafety.api.apis.SynchronisationApi
import au.com.heightsafety.api.infrastructure.ApiClient
import au.com.heightsafety.domain.FieldSession
import au.com.heightsafety.domain.OfflineAccessSession
import au.com.heightsafety.domain.PhotoUploadDelivery
import au.com.heightsafety.domain.PhotoUploadQueueDrainer
import au.com.heightsafety.domain.PhotoUploadTransport
import au.com.heightsafety.domain.PhotoUploadQueueState
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

public object PhotoUploadWork {
    public const val UNIQUE_WORK_NAME: String = "height-safety-photo-upload-queue"

    @Volatile
    private var activeSession: FieldSession? = null

    public fun enqueue(context: Context) {
        val constraints = Constraints.Builder()
            .setRequiredNetworkType(NetworkType.CONNECTED)
            .build()
        WorkManager.getInstance(context.applicationContext).enqueueUniqueWork(
            UNIQUE_WORK_NAME,
            ExistingWorkPolicy.KEEP,
            OneTimeWorkRequestBuilder<PhotoUploadWorker>()
                .setConstraints(constraints)
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build(),
        )
    }

    public fun enqueue(context: Context, session: FieldSession) {
        activeSession = session
        enqueue(context)
    }

    public fun clearSession() {
        activeSession = null
    }

    internal fun sessionForWorker(): FieldSession? = activeSession
}

public class PhotoUploadWorker internal constructor(
    appContext: Context,
    workerParams: WorkerParameters,
    private val drainer: PhotoUploadQueueDrainer,
    private val canUpload: suspend () -> Boolean = { true },
    private val reconcileOfflineAccess: suspend () -> Unit = {},
) : CoroutineWorker(appContext, workerParams) {
    public constructor(
        appContext: Context,
        workerParams: WorkerParameters,
    ) : this(
        appContext,
        workerParams,
        defaultPhotoUploadDrainer(appContext),
        canUpload = { defaultPhotoUploadAllowed(appContext) },
        reconcileOfflineAccess = { reconcileDefaultPhotoAccess(appContext) },
    )

    override suspend fun doWork(): Result = try {
        if (!canUpload()) {
            Result.success()
        } else {
            val drain = withContext(Dispatchers.IO) { drainer.drain() }
            reconcileOfflineAccess()
            if (drain.requiresRetry) Result.retry() else Result.success()
        }
    } catch (error: CancellationException) {
        throw error
    } catch (_: Exception) {
        // The queue remains durable and the next run recovers in-flight work.
        Result.retry()
    }
}

private fun defaultPhotoUploadDrainer(context: Context): PhotoUploadQueueDrainer =
    PhotoUploadWork.sessionForWorker().let { session ->
        val store = EncryptedJobPackStore(context.applicationContext)
        val apiClient = session?.let {
            ApiClient(
                baseUrl = context.getString(R.string.api_base_url),
                authNames = arrayOf("access-token"),
            )
        }
        val transport = when {
            session == null -> UnconfiguredPhotoUploadTransport
            session.isExpired(System.currentTimeMillis()) -> SessionExpiredPhotoUploadTransport
            else -> {
                val authenticatedSession = session
                val authenticatedApiClient = apiClient
                    ?: error("authenticated photo worker API client is unavailable")
                OpenApiPhotoUploadTransport(
                    synchronisationApi = authenticatedApiClient
                        .createService(SynchronisationApi::class.java),
                    session = authenticatedSession,
                    bearerTokenSink = authenticatedApiClient::setBearerToken,
                )
            }
        }
        PhotoUploadQueueDrainer(
            store = store,
            contentSource = LocalAnchorPhotoUploadContentSource(
                LocalAnchorPhotoStorage(context.applicationContext),
            ),
            transport = transport,
            nowEpochMillis = { System.currentTimeMillis() },
            companyId = session?.companyId,
        )
    }

private suspend fun defaultPhotoUploadAllowed(context: Context): Boolean {
    val session = PhotoUploadWork.sessionForWorker() ?: return false
    if (session.isExpired(System.currentTimeMillis())) return false
    val access = defaultPhotoOfflineAccessSession(context)
    return try {
        access.restore(session.companyId, session.userId).state.canUpload()
    } catch (error: CancellationException) {
        throw error
    } catch (_: Exception) {
        false
    }
}

private suspend fun reconcileDefaultPhotoAccess(context: Context) {
    val session = PhotoUploadWork.sessionForWorker() ?: return
    val store = EncryptedJobPackStore(context.applicationContext)
    val access = defaultPhotoOfflineAccessSession(context)
    val restored = access.restore(session.companyId, session.userId)
    if (!restored.state.canUpload()) return
    val uploadedPhotoIds = store.loadPhotoUploads(session.companyId)
        .filter { it.state == PhotoUploadQueueState.UPLOADED }
        .map { it.localId }
        .toSet()
    if (uploadedPhotoIds.isNotEmpty()) {
        access.acknowledgePending(
            photoIds = uploadedPhotoIds,
            actorUserId = session.userId,
        )
    }
}

private fun defaultPhotoOfflineAccessSession(context: Context) = OfflineAccessSession(
    store = EncryptedJobPackStore(context.applicationContext),
    nowEpochMillis = { System.currentTimeMillis() },
    elapsedRealtimeMillis = { android.os.SystemClock.elapsedRealtime() },
)

private object UnconfiguredPhotoUploadTransport : PhotoUploadTransport {
    override suspend fun upload(
        chunk: au.com.heightsafety.domain.PhotoUploadChunk,
    ): PhotoUploadDelivery = PhotoUploadDelivery.PermanentFailure(
        "Photo upload transport is not configured.",
    )
}


private object SessionExpiredPhotoUploadTransport : PhotoUploadTransport {
    override suspend fun upload(
        chunk: au.com.heightsafety.domain.PhotoUploadChunk,
    ): PhotoUploadDelivery = PhotoUploadDelivery.PermanentFailure(
        "Active field session is expired; sign in again before uploading photos.",
    )
}
