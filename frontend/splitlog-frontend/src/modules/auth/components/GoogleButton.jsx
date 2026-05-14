import { GoogleLogin } from "@react-oauth/google";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { AUTH_ROUTES, AUTH_MESSAGES } from "../utils/auth.constants";

export function GoogleButton({ actionText = "continue_with", onError }) {
  const navigate = useNavigate();
  const { googleLogin } = useAuth();

  const handleSuccess = async (credentialResponse) => {
    const result = await googleLogin(credentialResponse.credential);
    
    if (result.success) {
      if (result.data.user.isProfileComplete === false) {
        navigate(AUTH_ROUTES.COMPLETE_PROFILE);
      } else {
        navigate(AUTH_ROUTES.DASHBOARD);
      }
    } else {
      onError(result.error || AUTH_MESSAGES.GENERIC_ERROR);
    }
  };

  const handleFailure = () => {
    onError(AUTH_MESSAGES.GENERIC_ERROR);
  };

  return (
    <div className="flex justify-center mt-4">
      <GoogleLogin
        onSuccess={handleSuccess}
        onError={handleFailure}
        theme="filled_black"
        shape="rectangular"
        text={actionText}
        width="100%"
      />
    </div>
  );
}
