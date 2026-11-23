package au.com.heightsafety.app

import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp

@Composable
internal fun AccountRevokedContent(
    state: FieldUiState.AccountRevoked,
    onStartRecovery: () -> Unit,
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        SignalStandaloneIcon(
            glyph = SignalGlyph.Person,
            contentDescription = null,
            tint = MaterialTheme.colorScheme.error,
            size = 48.dp,
        )
        Spacer(modifier = Modifier.height(16.dp))
        Text(
            text = stringResource(R.string.account_access_unavailable_title),
            style = MaterialTheme.typography.headlineSmall,
            fontWeight = FontWeight.SemiBold,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = state.account.email,
            modifier = Modifier.fillMaxWidth(),
        )
        Text(
            text = stringResource(R.string.company_value, state.account.companyId),
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        Spacer(modifier = Modifier.height(12.dp))
        Text(
            text = state.message,
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.error,
        )
        Spacer(modifier = Modifier.height(8.dp))
        Text(
            text = stringResource(R.string.recovery_evidence_note),
            modifier = Modifier.fillMaxWidth(),
            color = MaterialTheme.colorScheme.onSurfaceVariant,
        )
        state.recoveryMessage?.let { message ->
            Spacer(modifier = Modifier.height(12.dp))
            Text(
                text = message,
                modifier = Modifier.fillMaxWidth(),
                color = MaterialTheme.colorScheme.primary,
            )
        }
        Spacer(modifier = Modifier.height(16.dp))
        SignalPrimaryButton(
            text = stringResource(
                if (state.isRecovering) {
                    R.string.authorising_recovery
                } else {
                    R.string.start_administrator_recovery
                },
            ),
            glyph = SignalGlyph.Person,
            onClick = onStartRecovery,
            enabled = !state.isRecovering,
            showProgress = state.isRecovering,
        )
    }
}
