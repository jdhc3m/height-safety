package au.com.heightsafety.app

import android.content.Intent
import androidx.test.core.app.ApplicationProvider
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test

class CameraCaptureIntentTest {
    private val context = ApplicationProvider.getApplicationContext<android.content.Context>()

    @Test
    fun resultIntentRoundTripsPhotoMetadata() {
        val photo = CapturedAnchorPhoto(
            companyId = "company-a",
            jobId = "job-001",
            inspectionId = "inspection-001",
            localId = "photo-001",
            storageReference = "anchor-photos/photo-001.jpg",
            capturedAtEpochMillis = 1_000L,
            checksum = "checksum",
            contentType = "image/jpeg",
        )

        assertEquals(
            photo,
            CameraCaptureIntent.capturedPhoto(
                CameraCaptureIntent.resultIntent(context, photo),
            ),
        )
    }

    @Test
    fun unmarkedIntentIsRejected() {
        assertNull(CameraCaptureIntent.capturedPhoto(Intent()))
    }
}
