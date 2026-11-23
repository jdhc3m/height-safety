plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("io.github.takahirom.roborazzi")
}

val auth0Domain = providers.gradleProperty("auth0Domain").orNull.orEmpty()
val auth0ClientId = providers.gradleProperty("auth0ClientId").orNull.orEmpty()
val auth0ApiAudience = providers.gradleProperty("auth0ApiAudience").orNull.orEmpty()
val apiBaseUrl = providers.gradleProperty("apiBaseUrl").orNull?.trim()
    ?.takeIf(String::isNotEmpty)
    ?: "https://api.example.test/api/v1/"

android {
    namespace = "au.com.heightsafety.app"
    compileSdk = 36

    defaultConfig {
        applicationId = "au.com.heightsafety.app"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "0.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        // Auth0 native-app values are public client configuration. Secrets stay
        // on the office/API server and are never placed in this APK.
        manifestPlaceholders["auth0Domain"] = auth0Domain
        manifestPlaceholders["auth0Scheme"] = "https"
        resValue("string", "com_auth0_client_id", auth0ClientId)
        resValue("string", "com_auth0_domain", auth0Domain)
        resValue("string", "auth0_api_audience", auth0ApiAudience)
        resValue("string", "api_base_url", apiBaseUrl)
    }

    buildFeatures {
        compose = true
        buildConfig = false
    }

    testOptions {
        unitTests {
            isIncludeAndroidResources = true
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlin {
        compilerOptions {
            jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
        }
    }
}

dependencies {
    implementation(project(":data"))
    implementation(project(":domain"))
    implementation("au.com.heightsafety:height-safety-api-client:0.0.0")
    implementation("com.auth0.android:auth0:4.1.0")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.camera:camera-camera2:1.5.3")
    implementation("androidx.camera:camera-core:1.5.3")
    implementation("androidx.camera:camera-lifecycle:1.5.3")
    implementation("androidx.camera:camera-view:1.5.3")
    implementation("androidx.compose.foundation:foundation:1.9.0")
    implementation("androidx.compose.material:material-icons-extended:1.7.8")
    implementation("androidx.compose.material3:material3:1.3.2")
    implementation("androidx.compose.ui:ui-tooling-preview:1.9.0")
    implementation("androidx.navigation:navigation-compose:2.9.5")
    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.work:work-runtime-ktx:2.11.2")
    implementation("com.squareup.okhttp3:logging-interceptor:5.1.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:3.0.0")
    implementation("com.squareup.retrofit2:converter-scalars:3.0.0")
    implementation("com.squareup.retrofit2:retrofit:3.0.0")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.test:core:1.7.0")
    testImplementation("io.github.takahirom.roborazzi:roborazzi:1.49.0")
    testImplementation("io.github.takahirom.roborazzi:roborazzi-compose:1.49.0")
    testImplementation("androidx.compose.ui:ui-test-junit4:1.9.0")
    testImplementation("androidx.compose.ui:ui-test-manifest:1.9.0")
    testImplementation("org.robolectric:robolectric:4.17")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")

    androidTestImplementation("androidx.compose.ui:ui-test-junit4:1.9.0")
    androidTestImplementation("androidx.test:core:1.7.0")
    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test:rules:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("junit:junit:4.13.2")
    debugImplementation("androidx.compose.ui:ui-test-manifest:1.9.0")
}
