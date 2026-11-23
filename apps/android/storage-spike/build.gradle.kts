plugins {
    id("com.android.library") version "8.11.1"
    id("org.jetbrains.kotlin.android") version "2.2.20"
    id("org.jetbrains.kotlin.kapt") version "2.2.20"
}

android {
    namespace = "au.com.heightsafety.storagespike"
    compileSdk = 35

    defaultConfig {
        minSdk = 23
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        consumerProguardFiles("consumer-rules.pro")
    }

    buildFeatures {
        buildConfig = false
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    packaging {
        resources.excludes += setOf("META-INF/DEPENDENCIES", "META-INF/LICENSE.md", "META-INF/LICENSE-notice.md")
    }
}

kapt {
    arguments {
        arg(
            "room.schemaLocation",
            providers.gradleProperty("roomSchemaLocation").orElse("$projectDir/schemas").get(),
        )
        arg("room.incremental", "true")
    }
}

kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

dependencyLocking {
    lockAllConfigurations()
}

dependencies {
    implementation("androidx.room:room-runtime:2.8.4")
    implementation("androidx.sqlite:sqlite:2.6.2")
    implementation("net.zetetic:sqlcipher-android:4.17.0@aar")
    kapt("androidx.room:room-compiler:2.8.4")

    androidTestImplementation("androidx.test:runner:1.7.0")
    androidTestImplementation("androidx.test.ext:junit:1.3.0")
    androidTestImplementation("junit:junit:4.13.2")
}

tasks.register("rejectAbandonedCipher") {
    group = "verification"
    description = "Rejects the end-of-life SQLCipher Android artifact."
    doLast {
        val abandoned =
            listOf("debugRuntimeClasspath", "releaseRuntimeClasspath").flatMap { configurationName ->
                val configuration = configurations.getByName(configurationName)
                configuration.resolvedConfiguration.resolvedArtifacts
                    .filter { artifact ->
                        artifact.moduleVersion.id.group == "net.zetetic" &&
                            artifact.name == "android-database-sqlcipher"
                    }
                    .map { artifact -> "${configuration.name}:${artifact.moduleVersion.id}" }
            }
        check(abandoned.isEmpty()) {
            "End-of-life android-database-sqlcipher resolved: ${abandoned.joinToString()}"
        }
    }
}

tasks.named("check") {
    dependsOn("rejectAbandonedCipher")
}
