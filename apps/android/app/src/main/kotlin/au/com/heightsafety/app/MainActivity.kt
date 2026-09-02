package au.com.heightsafety.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.enableEdgeToEdge
import androidx.activity.compose.setContent
import androidx.compose.runtime.getValue
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.collectAsState
import au.com.heightsafety.api.infrastructure.ApiClient

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            val scope = rememberCoroutineScope()
            val viewModel = remember(scope) {
                val apiClient = ApiClient(
                    baseUrl = getString(R.string.api_base_url),
                    authNames = arrayOf("access-token"),
                )
                FieldViewModel(
                    gateway = OpenApiFieldGateway(apiClient),
                    providerAccessTokenSource = UnconfiguredProviderAccessTokenSource(),
                    scope = scope,
                )
            }
            val state by viewModel.uiState.collectAsState()
            FieldScreen(
                state = state,
                onSignIn = viewModel::signIn,
                onRetry = viewModel::retry,
                onRefresh = viewModel::refreshJobs,
                onSignOut = viewModel::signOut,
            )
        }
    }
}
