import {
  validateRegisterInput,
  validateLoginInput,
  validateGoogleLoginInput,
  validateProfileCompletion,
  validateVerifyEmailInput,
  validateResendVerificationInput,
  validateForgotPasswordInput,
  validateResetPasswordInput
} from "../modules/auth/auth.validators.js";

const runTests = () => {
  let failed = 0;

  const assertEqual = (actual, expected, testName) => {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);
    if (actualStr !== expectedStr) {
      console.error(`❌ FAIL: ${testName}\n  Expected: ${expectedStr}\n  Actual:   ${actualStr}`);
      failed++;
    } else {
      console.log(`✅ PASS: ${testName}`);
    }
  };

  // 1. validateRegisterInput
  assertEqual(
    validateRegisterInput({ name: "", username: "user123", email: "test@test.com", password: "password" }),
    { error: "All fields are required" },
    "register: empty name"
  );
  assertEqual(
    validateRegisterInput({ name: "Name", username: "user", email: "test@test.com", password: "password" }),
    { error: "Username must be at least 6 characters long" },
    "register: short username"
  );
  assertEqual(
    validateRegisterInput({ name: "Name", username: "username123", email: "invalid-email", password: "password" }),
    { error: "Please provide a valid email address" },
    "register: invalid email"
  );
  assertEqual(
    validateRegisterInput({ name: "Name", username: "username123", email: "test@test.com", password: "123" }),
    { error: "Password must be at least 6 characters long" },
    "register: short password"
  );
  assertEqual(
    validateRegisterInput({ name: "Name", username: "username123", email: "test@test.com", password: "password" }),
    { error: null, value: { name: "Name", username: "username123", email: "test@test.com", password: "password" } },
    "register: valid inputs"
  );

  // 2. validateLoginInput
  assertEqual(
    validateLoginInput({ emailOrUsername: "", password: "password" }),
    { error: "All fields are required" },
    "login: empty emailOrUsername"
  );
  assertEqual(
    validateLoginInput({ emailOrUsername: "user", password: "" }),
    { error: "All fields are required" },
    "login: empty password"
  );
  assertEqual(
    validateLoginInput({ emailOrUsername: "user", password: "password" }),
    { error: null, value: { emailOrUsername: "user", password: "password" } },
    "login: valid inputs"
  );

  // 3. validateGoogleLoginInput
  assertEqual(
    validateGoogleLoginInput({}),
    { error: "Google credential is required" },
    "googleLogin: empty"
  );
  assertEqual(
    validateGoogleLoginInput({ credential: "abc" }),
    { error: null, value: { credential: "abc" } },
    "googleLogin: valid credential"
  );

  // 4. validateProfileCompletion
  assertEqual(
    validateProfileCompletion({ username: "" }),
    { error: "Username is required." },
    "profileCompletion: empty username"
  );
  assertEqual(
    validateProfileCompletion({ username: "abc" }),
    { error: "Username must be at least 6 characters." },
    "profileCompletion: short username"
  );
  assertEqual(
    validateProfileCompletion({ username: "username" }),
    { error: null, value: { username: "username" } },
    "profileCompletion: valid username"
  );

  // 5. validateVerifyEmailInput
  assertEqual(
    validateVerifyEmailInput({}),
    { error: "Verification token is missing." },
    "verifyEmail: empty token"
  );
  assertEqual(
    validateVerifyEmailInput({ token: "token123" }),
    { error: null, value: { token: "token123" } },
    "verifyEmail: valid token"
  );

  // 6. validateResendVerificationInput
  assertEqual(
    validateResendVerificationInput({}),
    { error: "Email is required." },
    "resendVerification: empty email"
  );
  assertEqual(
    validateResendVerificationInput({ email: "invalid-email" }),
    { error: "Please provide a valid email address" },
    "resendVerification: invalid email"
  );
  assertEqual(
    validateResendVerificationInput({ email: "test@test.com" }),
    { error: null, value: { email: "test@test.com" } },
    "resendVerification: valid email"
  );

  // 7. validateForgotPasswordInput
  assertEqual(
    validateForgotPasswordInput({}),
    { error: "Email is required." },
    "forgotPassword: empty email"
  );
  assertEqual(
    validateForgotPasswordInput({ email: "invalid-email" }),
    { error: "Please provide a valid email address" },
    "forgotPassword: invalid email"
  );
  assertEqual(
    validateForgotPasswordInput({ email: "test@test.com" }),
    { error: null, value: { email: "test@test.com" } },
    "forgotPassword: valid email"
  );

  // 8. validateResetPasswordInput
  assertEqual(
    validateResetPasswordInput({ token: "", newPassword: "password" }),
    { error: "Token and new password are required." },
    "resetPassword: empty token"
  );
  assertEqual(
    validateResetPasswordInput({ token: "token123", newPassword: "123" }),
    { error: "Password must be at least 6 characters." },
    "resetPassword: short password"
  );
  assertEqual(
    validateResetPasswordInput({ token: "token123", newPassword: "password" }),
    { error: null, value: { token: "token123", newPassword: "password" } },
    "resetPassword: valid inputs"
  );

  console.log(`\nTest results: ${failed === 0 ? "SUCCESS" : "FAILED"}`);
  process.exit(failed === 0 ? 0 : 1);
};

runTests();
