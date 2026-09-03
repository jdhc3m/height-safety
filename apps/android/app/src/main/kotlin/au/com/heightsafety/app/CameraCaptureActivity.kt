package au.com.heightsafety.app

import android.Manifest
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.camera.core.CameraSelector
import androidx.camera.core.ImageCapture
import androidx.camera.core.ImageCaptureException
import androidx.camera.core.Preview
import androidx.camera.lifecycle.ProcessCameraProvider
import androidx.camera.view.PreviewView
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.unit.dp
import androidx.compose.ui.viewinterop.AndroidView
import androidx.core.content.ContextCompat
import androidx.lifecycle.lifecycleScope
import au.com.heightsafety.data.LocalAnchorPhotoStorage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.util.UUID

public data class CapturedAnchorPhoto(
    val companyId: String,
    val jobId: String,
    val inspectionId: String,
    val localId: String,
    val storageReference: String,
    val capturedAtEpochMillis: Long,
    val checksum: String,
    val contentType: String,
) {
    init {
        require(companyId.isNotBlank())
        require(jobId.isNotBlank())
        require(inspectionId.isNotBlank())
        require(
            localId.isNotBlank() && localId.length <= 80 && localId.all { character ->
                character.isLetterOrDigit() || character == '-' || character == '_'
            },
        )
        require(storageReference.isNotBlank())
        require(storageReference == "anchor-photos/$localId.jpg")
        require(capturedAtEpochMillis >= 0)
        require(checksum.isNotBlank())
        require(contentType == "image/jpeg")
    }
}

public object CameraCaptureIntent {
    private const val EXTRA_COMPANY_ID = "au.com.heightsafety.camera.COMPANY_ID"
    private const val EXTRA_JOB_ID = "au.com.heightsafety.camera.JOB_ID"
    private const val EXTRA_INSPECTION_ID = "au.com.heightsafety.camera.INSPECTION_ID"
    private const val EXTRA_LOCAL_ID = "au.com.heightsafety.camera.LOCAL_ID"
    private const val EXTRA_PHOTO_DIRECTORY = "au.com.heightsafety.camera.PHOTO_DIRECTORY"
    private const val EXTRA_STORAGE_REFERENCE = "au.com.heightsafety.camera.STORAGE_REFERENCE"
    private const val EXTRA_CAPTURED_AT = "au.com.heightsafety.camera.CAPTURED_AT"
    private const val EXTRA_CHECKSUM = "au.com.heightsafety.camera.CHECKSUM"
    private const val EXTRA_CONTENT_TYPE = "au.com.heightsafety.camera.CONTENT_TYPE"
    private const val EXTRA_RESULT_MARKER = "au.com.heightsafety.camera.RESULT"

    public fun create(
        context: Context,
        companyId: String,
        jobId: String,
        inspectionId: String,
        localId: String = UUID.randomUUID().toString(),
        photoDirectoryName: String = DEFAULT_PHOTO_DIRECTORY_NAME,
    ): Intent = Intent(context, CameraCaptureActivity::class.java).apply {
        putExtra(EXTRA_COMPANY_ID, companyId)
        putExtra(EXTRA_JOB_ID, jobId)
        putExtra(EXTRA_INSPECTION_ID, inspectionId)
        putExtra(EXTRA_LOCAL_ID, localId)
        putExtra(EXTRA_PHOTO_DIRECTORY, photoDirectoryName)
    }

    internal fun request(intent: Intent): CameraCaptureRequest? {
        val companyId = intent.getStringExtra(EXTRA_COMPANY_ID) ?: return null
        val jobId = intent.getStringExtra(EXTRA_JOB_ID) ?: return null
        val inspectionId = intent.getStringExtra(EXTRA_INSPECTION_ID) ?: return null
        val localId = intent.getStringExtra(EXTRA_LOCAL_ID) ?: return null
        val photoDirectoryName = intent.getStringExtra(EXTRA_PHOTO_DIRECTORY)
            ?: DEFAULT_PHOTO_DIRECTORY_NAME
        if (
            companyId.isBlank() || jobId.isBlank() || inspectionId.isBlank() ||
            localId.isBlank() || localId.length > 80 ||
            localId != localId.filter { it.isLetterOrDigit() || it == '-' || it == '_' } ||
            photoDirectoryName.isBlank() || photoDirectoryName.length > 80 ||
            photoDirectoryName != photoDirectoryName.filter { it.isLetterOrDigit() || it == '-' || it == '_' }
        ) {
            return null
        }
        return CameraCaptureRequest(companyId, jobId, inspectionId, localId, photoDirectoryName)
    }

    internal fun resultIntent(context: Context, photo: CapturedAnchorPhoto): Intent =
        Intent(context, CameraCaptureActivity::class.java).apply {
        putExtra(EXTRA_RESULT_MARKER, true)
        putExtra(EXTRA_COMPANY_ID, photo.companyId)
        putExtra(EXTRA_JOB_ID, photo.jobId)
        putExtra(EXTRA_INSPECTION_ID, photo.inspectionId)
        putExtra(EXTRA_LOCAL_ID, photo.localId)
        putExtra(EXTRA_STORAGE_REFERENCE, photo.storageReference)
        putExtra(EXTRA_CAPTURED_AT, photo.capturedAtEpochMillis)
        putExtra(EXTRA_CHECKSUM, photo.checksum)
        putExtra(EXTRA_CONTENT_TYPE, photo.contentType)
    }

    internal fun resultIntent(photo: CapturedAnchorPhoto): Intent = Intent().apply {
        putExtra(EXTRA_RESULT_MARKER, true)
        putExtra(EXTRA_COMPANY_ID, photo.companyId)
        putExtra(EXTRA_JOB_ID, photo.jobId)
        putExtra(EXTRA_INSPECTION_ID, photo.inspectionId)
        putExtra(EXTRA_LOCAL_ID, photo.localId)
        putExtra(EXTRA_STORAGE_REFERENCE, photo.storageReference)
        putExtra(EXTRA_CAPTURED_AT, photo.capturedAtEpochMillis)
        putExtra(EXTRA_CHECKSUM, photo.checksum)
        putExtra(EXTRA_CONTENT_TYPE, photo.contentType)
    }

    public fun capturedPhoto(intent: Intent?): CapturedAnchorPhoto? {
        if (intent == null || !intent.getBooleanExtra(EXTRA_RESULT_MARKER, false)) return null
        return runCatching {
            CapturedAnchorPhoto(
                companyId = intent.getStringExtra(EXTRA_COMPANY_ID).orEmpty(),
                jobId = intent.getStringExtra(EXTRA_JOB_ID).orEmpty(),
                inspectionId = intent.getStringExtra(EXTRA_INSPECTION_ID).orEmpty(),
                localId = intent.getStringExtra(EXTRA_LOCAL_ID).orEmpty(),
                storageReference = intent.getStringExtra(EXTRA_STORAGE_REFERENCE).orEmpty(),
                capturedAtEpochMillis = intent.getLongExtra(EXTRA_CAPTURED_AT, -1L),
                checksum = intent.getStringExtra(EXTRA_CHECKSUM).orEmpty(),
                contentType = intent.getStringExtra(EXTRA_CONTENT_TYPE).orEmpty(),
            )
        }.getOrNull()
    }
}

internal data class CameraCaptureRequest(
    val companyId: String,
    val jobId: String,
    val inspectionId: String,
    val localId: String,
    val photoDirectoryName: String,
)

private const val DEFAULT_PHOTO_DIRECTORY_NAME = "job-pack"

public class CameraCaptureActivity : ComponentActivity() {
    private lateinit var request: CameraCaptureRequest
    private lateinit var photoStorage: LocalAnchorPhotoStorage
    private var imageCapture: ImageCapture? = null
    private var cameraProvider: ProcessCameraProvider? = null
    private var boundPreview: PreviewView? = null
    private var permissionGranted by mutableStateOf(false)
    private var captureInProgress by mutableStateOf(false)
    private var cameraError by mutableStateOf<String?>(null)

    private val cameraPermissionLauncher = registerForActivityResult(
        ActivityResultContracts.RequestPermission(),
    ) { granted ->
        permissionGranted = granted
        if (!granted) cameraError = "Camera permission is required to capture evidence."
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        request = CameraCaptureIntent.request(intent) ?: run {
            finishCanceled()
            return
        }
        photoStorage = LocalAnchorPhotoStorage(applicationContext, request.photoDirectoryName)
        permissionGranted = ContextCompat.checkSelfPermission(
            this,
            Manifest.permission.CAMERA,
        ) == PackageManager.PERMISSION_GRANTED

        setContent {
            MaterialTheme {
                CameraCaptureContent(
                    permissionGranted = permissionGranted,
                    captureInProgress = captureInProgress,
                    error = cameraError,
                    onPreviewReady = ::bindCamera,
                    onCapture = ::capturePhoto,
                    onCancel = ::finishCanceled,
                )
            }
        }
        if (!permissionGranted) cameraPermissionLauncher.launch(Manifest.permission.CAMERA)
    }

    override fun onDestroy() {
        cameraProvider?.unbindAll()
        super.onDestroy()
    }

    private fun bindCamera(previewView: PreviewView) {
        if (!permissionGranted || boundPreview === previewView) return
        boundPreview = previewView
        val providerFuture = ProcessCameraProvider.getInstance(this)
        providerFuture.addListener({
            runCatching {
                val provider = providerFuture.get()
                val preview = Preview.Builder().build().also {
                    it.surfaceProvider = previewView.surfaceProvider
                }
                val capture = ImageCapture.Builder()
                    .setCaptureMode(ImageCapture.CAPTURE_MODE_MAXIMIZE_QUALITY)
                    .setJpegQuality(95)
                    .build()
                provider.unbindAll()
                provider.bindToLifecycle(
                    this,
                    CameraSelector.DEFAULT_BACK_CAMERA,
                    preview,
                    capture,
                )
                cameraProvider = provider
                imageCapture = capture
            }.onFailure {
                cameraError = "Unable to start camera. Try again."
            }
        }, ContextCompat.getMainExecutor(this))
    }

    private fun capturePhoto() {
        val capture = imageCapture ?: run {
            cameraError = "Camera is still starting. Try again."
            return
        }
        if (captureInProgress) return
        captureInProgress = true
        val file = photoStorage.photoFile(request.localId)
        capture.takePicture(
            ImageCapture.OutputFileOptions.Builder(file).build(),
            ContextCompat.getMainExecutor(this),
            object : ImageCapture.OnImageSavedCallback {
                override fun onImageSaved(outputFileResults: ImageCapture.OutputFileResults) {
                    lifecycleScope.launch(Dispatchers.IO) {
                        val result = runCatching {
                            val metadata = photoStorage.describe(
                                localId = request.localId,
                                capturedAtEpochMillis = System.currentTimeMillis(),
                            )
                            CapturedAnchorPhoto(
                                companyId = request.companyId,
                                jobId = request.jobId,
                                inspectionId = request.inspectionId,
                                localId = metadata.localId,
                                storageReference = metadata.storageReference,
                                capturedAtEpochMillis = metadata.capturedAtEpochMillis,
                                checksum = metadata.checksum,
                                contentType = metadata.contentType,
                            )
                        }
                        withContext(Dispatchers.Main.immediate) {
                            result.onSuccess { photo ->
                                setResult(
                                    Activity.RESULT_OK,
                                    CameraCaptureIntent.resultIntent(
                                        this@CameraCaptureActivity,
                                        photo,
                                    ),
                                )
                                finish()
                            }.onFailure {
                                photoStorage.delete(request.localId)
                                captureInProgress = false
                                cameraError = "Captured photo could not be verified. Try again."
                            }
                        }
                    }
                }

                override fun onError(exception: ImageCaptureException) {
                    photoStorage.delete(request.localId)
                    captureInProgress = false
                    cameraError = "Photo capture failed. Try again."
                }
            },
        )
    }

    private fun finishCanceled() {
        if (::request.isInitialized && ::photoStorage.isInitialized) {
            photoStorage.delete(request.localId)
        }
        setResult(Activity.RESULT_CANCELED)
        finish()
    }
}

@Composable
private fun CameraCaptureContent(
    permissionGranted: Boolean,
    captureInProgress: Boolean,
    error: String?,
    onPreviewReady: (PreviewView) -> Unit,
    onCapture: () -> Unit,
    onCancel: () -> Unit,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(16.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        Text("Capture anchor photo", style = MaterialTheme.typography.headlineSmall)
        Text("Photo will remain associated with selected anchor.")
        if (permissionGranted) {
            AndroidView(
                factory = { context ->
                    PreviewView(context).also(onPreviewReady)
                },
                modifier = Modifier.weight(1f).fillMaxWidth(),
            )
            error?.let { Text(it, color = MaterialTheme.colorScheme.error) }
            Button(
                onClick = onCapture,
                enabled = !captureInProgress,
                modifier = Modifier.fillMaxWidth(),
            ) {
                Text(if (captureInProgress) "Capturing…" else "Capture photo")
            }
        } else {
            Text(error ?: "Waiting for camera permission.")
        }
        Button(onClick = onCancel, modifier = Modifier.fillMaxWidth()) {
            Text("Cancel")
        }
    }
}
