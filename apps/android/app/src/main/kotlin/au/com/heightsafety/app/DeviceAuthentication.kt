package au.com.heightsafety.app

fun interface DeviceAuthenticationGate {
    suspend fun authenticate(): Boolean
}

class DeviceAuthenticationRequiredException : IllegalStateException(
    "device authentication is required before opening a job pack",
)
