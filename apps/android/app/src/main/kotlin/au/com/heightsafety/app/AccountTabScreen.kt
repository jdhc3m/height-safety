package au.com.heightsafety.app

import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.verticalScroll
import androidx.compose.runtime.Composable
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.compose.ui.unit.dp

@Composable
internal fun AccountTabContent(
    state: FieldUiState,
    onSignOut: () -> Unit,
) {
    val account = stateJobsAccount(state) ?: return
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState()),
    ) {
        SignalHeader(
            title = stringResource(R.string.account_tab_title),
            subtitle = account.email,
            glyph = SignalGlyph.Person,
        )
        Spacer(modifier = Modifier.height(16.dp))
        SignalInfoRow(
            glyph = SignalGlyph.Industry,
            text = stringResource(R.string.company_value, account.companyId),
        )
        SignalInfoRow(
            glyph = SignalGlyph.Person,
            text = stringResource(R.string.account_role_value, stringResource(roleLabel(account.role))),
        )
        Spacer(modifier = Modifier.height(24.dp))
        SignalPrimaryButton(
            text = stringResource(R.string.sign_out),
            glyph = SignalGlyph.Person,
            onClick = onSignOut,
        )
    }
}
