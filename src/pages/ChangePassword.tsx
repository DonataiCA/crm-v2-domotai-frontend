import { ChangePasswordForm } from "@/components/auth/ChangePasswordForm";
import { useNavigate } from "react-router-dom";

const ChangePassword = () => {
  const navigate = useNavigate();

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Change Password</h1>
      <ChangePasswordForm onSuccess={() => navigate("/")} />
    </div>
  );
};

export default ChangePassword;