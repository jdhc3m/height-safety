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
import au.com.heightsafety.domain.PhotoUploadDelivery
import au.com.heightsafety.domain.PhotoUploadQueueDrainer
import au.com.heightsafety.domain.PhotoUploadTransport
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.util.concurrent.TimeUnit

public object PhotoUploadWork {
    public const val UNIQUE_WORK_NAME: String = "height-safety-photo-upload-queue"

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
}

public class PhotoUploadWorker internal constructor(
    appContext: Context,
    workerParams: WorkerParameters,
    private val drainer: PhotoUploadQueueDrainer,
) : CoroutineWorker(appContext, workerParams) {
    public constructor(
        appContext: Context,
        workerParams: WorkerParameters,
    ) : this(appContext, workerParams, defaultPhotoUploadDrainer(appContext))

    override suspend fun doWork(): Result = try {
        val drain = withContext(Dispatchers.IO) { drainer.drain() }
        if (drain.requiresRetry) Result.retry() else Result.success()
    } catch (error: CancellationException) {
        throw error
    } catch (_: Exception) {
        // The queue remains durable and the next run recovers in-flight work.
        Result.retry()
    }
}

private fun defaultPhotoUploadDrainer(context: Context): PhotoUploadQueueDrainer =
    PhotoUploadQueueDrainer(
        store = EncryptedJobPackStore(context.applicationContext),
        contentSource = LocalAnchorPhotoUploadContentSource(
            LocalAnchorPhotoStorage(context.applicationContext),
        ),
        transport = UnconfiguredPhotoUploadTransport,
        nowEpochMillis = { System.currentTimeMillis() },
    )

private object UnconfiguredPhotoUploadTransport : PhotoUploadTransport {
    override suspend fun upload(
        chunk: au.com.heightsafety.domain.PhotoUploadChunk,
    ): PhotoUploadDelivery = PhotoUploadDelivery.PermanentFailure(
        "Photo upload transport is not configured.",
    )
}
