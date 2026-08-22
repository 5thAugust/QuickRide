import { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import axios from "axios";
import Console from "../utils/console";
import mailImg from "/mail.png";
import { Button, Spinner } from "../components";

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const { userType } = useParams();
  const emailVerificationToken = searchParams.get("token");

  const [response, setResponse] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const verifyEmail = async () => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/${userType}/verify-email`,
        { token: emailVerificationToken }
      );
      console.log(response.data)
      if (response.status === 200) {
        Console.log("Email verified successfully:", response.data);
        setResponse("Email của bạn đã được xác minh thành công. Bạn có thể tiếp tục sử dụng ứng dụng.");
      }
    } catch (error) {
      Console.error("Error verifying email:", error);
      if (error.response.data.message === "Token Expired") {
        setResponse("Liên kết xác minh của bạn đã hết hạn. Vui lòng yêu cầu liên kết xác minh mới.");
      } else if (error.response && error.response.data && error.response.data.message) {
        setResponse(error.response.data.message || "Đã xảy ra lỗi khi xác minh email của bạn.");
      } else {
        setResponse("Đã xảy ra lỗi không mong muốn. Vui lòng thử lại sau.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (emailVerificationToken) {
      verifyEmail();
    } else {
      setResponse("Liên kết xác minh không hợp lệ.");
    }
  }, [emailVerificationToken]);
  return (
    <div className="w-full h-dvh flex flex-col items-center justify-center text-center p-4 md:h-auto md:max-w-md md:mx-auto md:my-12 md:rounded-2xl md:shadow-xl md:border md:border-zinc-100 md:p-8">

      <h1 className="text-2xl font-bold">Xác minh Email</h1>
      <img src={mailImg} alt="Verify Email" className="h-24 mx-auto mb-4" />

      <p className="text-md font-semibold">
        {loading ? <Spinner /> : response}
      </p>
      <p className="my-4">{loading && "Đang xác minh email..."}</p>
      <Button
        title={"Về trang chủ"}
        fun={() => navigate(userType === 'captain' ? '/captain/home' : '/home')}
        disabled={loading}
      />
    </div>
  );
};

export default VerifyEmail;
