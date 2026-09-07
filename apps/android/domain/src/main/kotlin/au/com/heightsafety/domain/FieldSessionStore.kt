package au.com.heightsafety.domain

/** Durable, platform-secure boundary for the current application session. */
public interface FieldSessionStore {
    public suspend fun loadSession(): FieldSession?

    public suspend fun saveSession(session: FieldSession)

    public suspend fun clearSession()
}
