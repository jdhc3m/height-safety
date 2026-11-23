package au.com.heightsafety.app

import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Badge
import androidx.compose.material3.BadgedBox
import androidx.compose.material3.Icon
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Modifier
import androidx.compose.ui.res.stringResource
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.navigation
import androidx.navigation.compose.rememberNavController
import au.com.heightsafety.app.icons.HeightSafetyIcons
import au.com.heightsafety.app.theme.HeightSafetyTheme
import au.com.heightsafety.domain.AnchorInspectionDraft
import au.com.heightsafety.domain.InspectorJob
import au.com.heightsafety.domain.JobPackAnchor

/**
 * Navigation shell for the field app (DESIGN.md §4.1, §6.1, §10). The field
 * state machine stays the single source of truth for signed-in flow position;
 * the shell maps states onto destinations, and the Jobs / Sync / Account tabs
 * are user-selected roots reachable whenever the bottom bar is visible.
 * Capture keeps its current screen behind the shell.
 */
@Composable
fun FieldScreen(
    state: FieldUiState,
    onSignIn: (String) -> Unit,
    onRetry: () -> Unit,
    onRefresh: () -> Unit,
    onSignOut: () -> Unit,
    onOpenJob: (InspectorJob) -> Unit = {},
    onCloseJobPack: () -> Unit = {},
    onOpenAnchor: (JobPackAnchor) -> Unit = {},
    onOpenEvidence: (AnchorInspectionDraft) -> Unit = {},
    onMarkAnchorNotInspected: (JobPackAnchor) -> Unit = {},
    onProposeAnchorReplacement: (JobPackAnchor) -> Unit = {},
    onProposeAnchorDuplicate: (JobPackAnchor) -> Unit = {},
    onAddDiscoveredAnchor: () -> Unit = {},
    onCloseAnchor: () -> Unit = {},
    onUpdateAnchorDraft: (AnchorInspectionDraft) -> Unit = {},
    onSaveAnchorDraft: () -> Unit = {},
    onCapturePhoto: () -> Unit = {},
    onOpenSubmissionReview: () -> Unit = {},
    onCloseSubmissionReview: () -> Unit = {},
    onQueueSubmission: () -> Unit = {},
    onStartAdministratorRecovery: () -> Unit = {},
) {
    HeightSafetyTheme {
        val navController = rememberNavController()
        var activeTab by rememberSaveable { mutableStateOf(FieldDestination.Jobs.route) }

        FieldStateNavigation(
            state = state,
            navController = navController,
            activeTab = activeTab,
            setActiveTab = { activeTab = it },
        )

        val backStackEntry by navController.currentBackStackEntryAsState()
        val currentRoute = backStackEntry?.destination?.route
        val showNavigationBar = currentRoute in FieldDestination.navigationBarRoutes
        val badgeCount = fieldSyncBadgeCount(state)

        Scaffold(
            containerColor = MaterialTheme.colorScheme.background,
            bottomBar = {
                if (showNavigationBar) {
                    FieldNavigationBar(
                        selectedTab = activeTab,
                        badgeCount = badgeCount,
                        onSelectTab = { tab ->
                            // Leaving the job pack through a tab goes through
                            // the state machine close action, never a silent
                            // navigation.
                            if (state is FieldUiState.JobPackOpened) {
                                onCloseJobPack()
                            }
                            activeTab = tab
                        },
                    )
                }
            },
        ) { innerPadding ->
            NavHost(
                navController = navController,
                startDestination = FieldDestination.SignIn.route,
                modifier = Modifier
                    .fillMaxSize()
                    .padding(innerPadding),
            ) {
                composable(FieldDestination.SignIn.route) {
                    when (val signInState = state) {
                        is FieldUiState.SignedOut -> SignInContent(
                            message = null,
                            isSigningIn = false,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.SigningIn -> SignInContent(
                            message = null,
                            isSigningIn = true,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.RestoringSession -> SignInContent(
                            message = null,
                            isSigningIn = true,
                            isRestoring = true,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.SessionExpired -> SignInContent(
                            message = signInState.message,
                            isSigningIn = false,
                            onSignIn = onSignIn,
                        )
                        is FieldUiState.Error -> if (signInState.account == null) {
                            SignInContent(
                                message = signInState.message,
                                isSigningIn = false,
                                onSignIn = onSignIn,
                            )
                        }
                        else -> Unit
                    }
                }
                composable(FieldDestination.Locked.route) {
                    (state as? FieldUiState.AppLocked)?.let { locked ->
                        AppLockedContent(
                            state = locked,
                            onUnlock = onRetry,
                        )
                    }
                }
                composable(FieldDestination.Revoked.route) {
                    (state as? FieldUiState.AccountRevoked)?.let { revoked ->
                        AccountRevokedContent(
                            state = revoked,
                            onStartRecovery = onStartAdministratorRecovery,
                        )
                    }
                }
                navigation(
                    startDestination = FieldDestination.Jobs.route,
                    route = FieldDestination.JOBS_GRAPH,
                ) {
                    composable(FieldDestination.Jobs.route) {
                        JobsHomeContent(
                            state = state,
                            onRetry = onRetry,
                            onRefresh = onRefresh,
                            onSignOut = onSignOut,
                            onOpenJob = onOpenJob,
                        )
                    }
                    composable(FieldDestination.JobPack.route) {
                        (state as? FieldUiState.JobPackOpened)?.let { opened ->
                            JobChecklistContent(
                                state = opened,
                                onClose = onCloseJobPack,
                                onOpenAnchor = onOpenAnchor,
                                onOpenEvidence = onOpenEvidence,
                                onMarkAnchorNotInspected = onMarkAnchorNotInspected,
                                onProposeAnchorReplacement = onProposeAnchorReplacement,
                                onProposeAnchorDuplicate = onProposeAnchorDuplicate,
                                onAddDiscoveredAnchor = onAddDiscoveredAnchor,
                                onOpenSubmissionReview = onOpenSubmissionReview,
                            )
                        }
                    }
                    composable(FieldDestination.SubmissionReview.route) {
                        when (val reviewState = state) {
                            is FieldUiState.OpeningSubmissionReview ->
                                SubmissionReviewLoadingContent()
                            is FieldUiState.SubmissionReview -> SubmissionReviewContent(
                                state = reviewState,
                                onClose = onCloseSubmissionReview,
                                onQueue = onQueueSubmission,
                            )
                            else -> Unit
                        }
                    }
                    composable(FieldDestination.Capture.route) {
                        (state as? FieldUiState.AnchorCapture)?.let { capture ->
                            AnchorCaptureContent(
                                state = capture,
                                onClose = onCloseAnchor,
                                onUpdateDraft = onUpdateAnchorDraft,
                                onSave = onSaveAnchorDraft,
                                onCapturePhoto = onCapturePhoto,
                            )
                        }
                    }
                }
                navigation(
                    startDestination = FieldDestination.Sync.route,
                    route = FieldDestination.SYNC_GRAPH,
                ) {
                    composable(FieldDestination.Sync.route) {
                        SyncTabContent(state = state)
                    }
                }
                navigation(
                    startDestination = FieldDestination.Account.route,
                    route = FieldDestination.ACCOUNT_GRAPH,
                ) {
                    composable(FieldDestination.Account.route) {
                        AccountTabContent(
                            state = state,
                            onSignOut = onSignOut,
                        )
                    }
                }
            }
        }
    }
}

@Composable
private fun FieldStateNavigation(
    state: FieldUiState,
    navController: NavHostController,
    activeTab: String,
    setActiveTab: (String) -> Unit,
) {
    val target = fieldDestinationFor(state)
    val backStackEntry by navController.currentBackStackEntryAsState()
    val currentRoute = backStackEntry?.destination?.route
    LaunchedEffect(target, activeTab, currentRoute) {
        // The first composition runs before the NavHost exposes its start
        // destination; the observed route key re-runs this effect once it is
        // available.
        if (currentRoute == null) return@LaunchedEffect
        when {
            target.depth == FieldDestination.AUTH_DEPTH -> {
                // Auth screens sit outside the tabs; the next sign-in starts
                // on the Jobs tab again.
                if (activeTab != FieldDestination.Jobs.route) {
                    setActiveTab(FieldDestination.Jobs.route)
                }
                navController.navigateToAuthDestination(target)
            }
            target.depth >= FieldDestination.JOB_PACK_DEPTH ->
                navController.navigateToPushedDestination(target)
            else ->
                // Signed-in root state: show the tab the user selected.
                navController.navigateToActiveTab(activeTab)
        }
    }
}

/** Auth destinations always leave a single-entry stack behind them. */
private fun NavHostController.navigateToAuthDestination(target: FieldDestination) {
    val currentRoute = currentDestination?.route ?: return
    if (currentRoute == target.route) return
    if (!popBackStack(target.route, inclusive = false)) {
        navigate(target.route) {
            popUpTo(graph.findStartDestination().id) { inclusive = true }
            launchSingleTop = true
        }
    }
}

/**
 * Pushed destinations follow the state machine back stack: deeper states are
 * pushed, closing a screen pops back to the state-machine parent.
 */
private fun NavHostController.navigateToPushedDestination(target: FieldDestination) {
    val currentRoute = currentDestination?.route ?: return
    if (currentRoute == target.route) return
    val currentDepth = FieldDestination.depthForRoute(currentRoute)
    when {
        currentDepth != null && target.depth > currentDepth ->
            navigate(target.route) { launchSingleTop = true }
        currentDepth != null && target.depth == currentDepth ->
            navigate(target.route) {
                popUpTo(currentRoute) { inclusive = true }
                launchSingleTop = true
            }
        else -> {
            if (!popBackStack(target.route, inclusive = false)) {
                navigate(target.route) {
                    popUpTo(graph.findStartDestination().id) { inclusive = true }
                    launchSingleTop = true
                }
            }
        }
    }
}

/**
 * Root states show the selected tab. Tab switches never join the back stack:
 * back from any root leaves the app, so predictive back stays available.
 */
private fun NavHostController.navigateToActiveTab(tabRoute: String) {
    val currentRoute = currentDestination?.route ?: return
    if (currentRoute == tabRoute) return
    if (!popBackStack(tabRoute, inclusive = false)) {
        navigate(tabRoute) {
            popUpTo(graph.findStartDestination().id) { inclusive = true }
            launchSingleTop = true
        }
    }
}

@Composable
private fun FieldNavigationBar(
    selectedTab: String,
    badgeCount: Int?,
    onSelectTab: (String) -> Unit,
) {
    NavigationBar {
        NavigationBarItem(
            selected = selectedTab == FieldDestination.Jobs.route,
            onClick = { onSelectTab(FieldDestination.Jobs.route) },
            icon = {
                Icon(
                    imageVector = HeightSafetyIcons.JobsFree,
                    contentDescription = null,
                )
            },
            label = { Text(stringResource(R.string.nav_jobs)) },
        )
        NavigationBarItem(
            selected = selectedTab == FieldDestination.Sync.route,
            onClick = { onSelectTab(FieldDestination.Sync.route) },
            icon = {
                val badgeCount = badgeCount?.takeIf { count -> count > 0 }
                val iconDescription = badgeCount?.let { count ->
                    stringResource(R.string.nav_sync_badge_content_description, count)
                }
                BadgedBox(
                    badge = {
                        badgeCount?.let { count ->
                            Badge { Text(text = count.toString()) }
                        }
                    },
                ) {
                    Icon(
                        imageVector = HeightSafetyIcons.SyncFree,
                        contentDescription = iconDescription,
                    )
                }
            },
            label = { Text(stringResource(R.string.nav_sync)) },
        )
        NavigationBarItem(
            selected = selectedTab == FieldDestination.Account.route,
            onClick = { onSelectTab(FieldDestination.Account.route) },
            icon = {
                Icon(
                    imageVector = HeightSafetyIcons.AccountFree,
                    contentDescription = null,
                )
            },
            label = { Text(stringResource(R.string.nav_account)) },
        )
    }
}
