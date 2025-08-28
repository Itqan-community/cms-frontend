import type { Locale, Dictionary } from './types';

const dictionaries = {
  ar: () => import("@/dictionaries/ar.json").then((module) => module.default as Dictionary),
  en: () => import("@/dictionaries/en.json").then((module) => module.default as Dictionary),
};

/**
 * Get dictionary for a locale with error handling
 */
export const getDictionary = async (locale: Locale): Promise<Dictionary> => {
  try {
    return await dictionaries[locale]();
  } catch (error) {
    console.error(`Failed to load dictionary for locale: ${locale}`, error);
    // Fallback to English if Arabic fails, or return default if English fails
    if (locale === 'ar') {
      try {
        return await dictionaries.en();
      } catch (fallbackError) {
        console.error('Failed to load fallback dictionary', fallbackError);
        // Return minimal dictionary to prevent app crash
        return getMinimalDictionary();
      }
    }
    return getMinimalDictionary();
  }
};

/**
 * Minimal dictionary for emergency fallback
 */
function getMinimalDictionary(): Dictionary {
  return {
    welcome: "Welcome",
    description: "A modern CMS application",
    getStarted: "Get Started",
    learnMore: "Learn More",
    language: "Language",
    arabic: "العربية",
    english: "English",
    switchLanguage: "Switch Language",
    home: "Home",
    about: "About",
    contact: "Contact",
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    save: "Save",
    edit: "Edit",
    delete: "Delete",
    confirm: "Confirm",
    close: "Close",
    darkMode: "Dark Mode",
    lightMode: "Light Mode",
    toggleTheme: "Toggle Theme",
    theme: "Theme",
    auth: {
      loginTitle: "Login to Developer Platform",
      signupTitle: "Create Account",
      loginWithGoogle: "Login with Google",
      loginWithGitHub: "Login with GitHub",
      email: "Email",
      password: "Password",
      login: "Login",
      signup: "Sign Up",
      firstName: "First Name",
      lastName: "Last Name",
      jobTitle: "Job Title",
      jobTitlePlaceholder: "Software Engineer",
      phoneNumber: "Phone Number",
      phoneNumberPlaceholder: "0965000000000",
      emailPlaceholder: "you@example.com",
      passwordPlaceholder: "********",
      noAccount: "Don't have an account?",
      alreadyHaveAccount: "Already have an account?",
      register: "Register",
      loginLink: "Log In",
      businessModel: "What is your business model? Are you going to make it paid? Which pricing model?",
      teamSize: "What is the size of your team?",
      aboutYourself: "Tell us more about yourself so that the publisher gets to know you more",
      completeProfile: "Complete Profile",
      profileCompletion: "Profile Completion",
      required: "Required",
      optional: "Optional",
      validation: {
        emailRequired: "Email is required",
        emailInvalid: "Please enter a valid email address",
        passwordRequired: "Password is required",
        passwordMinLength: "Password must be at least 8 characters",
        firstNameRequired: "First name is required",
        lastNameRequired: "Last name is required",
        jobTitleRequired: "Job title is required",
        phoneRequired: "Phone number is required",
        phoneInvalid: "Please enter a valid phone number",
        businessModelRequired: "Business model is required",
        teamSizeRequired: "Team size is required",
        aboutYourselfRequired: "About yourself is required",
        fieldTooShort: "This field is too short",
        fieldTooLong: "This field is too long",
        loginFailed: "Login failed. Please check your credentials",
        signupFailed: "Signup failed. Please try again",
        networkError: "Network error. Please check your internet connection"
      }
    }
  };
}

/**
 * Preload dictionaries for better performance
 */
export async function preloadDictionaries(): Promise<void> {
  try {
    await Promise.all([
      dictionaries.ar(),
      dictionaries.en(),
    ]);
  } catch (error) {
    console.warn('Failed to preload some dictionaries', error);
  }
}
