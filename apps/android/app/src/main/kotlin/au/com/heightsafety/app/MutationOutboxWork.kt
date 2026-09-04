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
import au.com.heightsafety.domain.MutationOutboxDrainer
import au.com.heightsafety.domain.SyncMutationDelivery
import au.com.heightsafety.domain.SyncMutationTransport
import kotlinx.coroutines.CancellationException
import java.util.concurrent.TimeUnit

public object MutationOutboxWork {
    public const val UNIQUE_WORK_NAME: String = "height-safety-mutation-outbox"

    public fun enqueue(context: Context) {
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
    MutationOutboxDrainer(
        store = EncryptedJobPackStore(context.applicationContext),
        transport = UnconfiguredMutationTransport,
        nowEpochMillis = { System.currentTimeMillis() },
    )

private object UnconfiguredMutationTransport : SyncMutationTransport {
    override suspend fun send(mutation: au.com.heightsafety.domain.SyncMutation): SyncMutationDelivery =
        SyncMutationDelivery.RetryableFailure(
            "Mutation synchronisation transport is not configured.",
        )
}
