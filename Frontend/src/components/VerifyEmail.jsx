import axios from "axios";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Console from "../utils/console";
import { ArrowLeft } from "lucide-react";
import Heading from "./Heading";
import Button from "./Button";
import mailImg from "/mail.png";
import useCooldownTimer from "../hooks/useCooldownTimer";
import { Alert } from "../components";
import { useAlert } from "../hooks/useAlert";

function VerifyEmail({ user, role }) {
    const navigation = useNavigate();
    const token = localStorage.getItem("token");
    const [loading, setLoading] = useState(false);
    const { alert, showAlert, hideAlert } = useAlert();
    const { timeLeft, isActive, startCooldown } = useCooldownTimer(60000, 'forgot-password-cooldown');

    const sendVerificationEmail = async () => {
        try {
            setLoading(true);
            const response = await axios.get(
                `${import.meta.env.VITE_SERVER_URL}/mail/verify-${role}-email`,
                {
                    headers: {
                        token: token,
                    },
                }
            );
            if (response.status === 200) {
                showAlert('Gửi email xác minh thành công!', 'Vui lòng kiểm tra hộp thư và nhấp vào liên kết nhận được để xác minh tài khoản', 'success');
                startCooldown();
            }
        } catch (error) {
            showAlert('Đã xảy ra lỗi', error.response.data.message, 'failure');
            Console.error("Error sending verification email:", error);
        } finally {
            setLoading(false);
        }
    };

    const getButtonTitle = () => {
        if (isActive) {
            return `Đợi ${timeLeft}s`;
        }
        return "Gửi email xác minh";
    };
    return (
        <div className="w-full h-dvh flex flex-col text-center p-4 pt-6 gap-24 md:h-auto md:max-w-md md:mx-auto md:my-12 md:rounded-2xl md:shadow-xl md:border md:border-zinc-100 md:p-8 md:gap-6">
            <Alert
                heading={alert.heading}
                text={alert.text}
                isVisible={alert.isVisible}
                onClose={hideAlert}
                type={alert.type}
            />
            <div className="flex gap-3">
                <ArrowLeft
                    strokeWidth={3}
                    className="mt-[5px] cursor-pointer"
                    onClick={() => navigation(-1)}
                />
                <Heading title={"Quay lại"} />
            </div>
            <div className="px-2">
                <p className="">Xin chào{` ${user?.fullname?.firstname}`}</p>
                <h1 className="text-2xl font-bold">Xác minh Email của bạn</h1>

                <img src={mailImg} alt="Verify Email" className="h-24 mx-auto mb-4" />
                <span className="inline-block font-semibold bg-green-200 rounded-lg px-4 py-2 my-3">
                    {user.email}
                </span>
                <p className="text-sm mb-6">
                    Nhấp vào nút Gửi email xác minh để gửi liên kết xác minh email
                    nhằm kích hoạt tài khoản của bạn.
                </p>
                <Button
                    title={getButtonTitle()}
                    classes={"bg-orange-500"}
                    loading={loading}
                    loadingMessage={"Đang gửi email..."}
                    fun={sendVerificationEmail}
                    disabled={loading || isActive}
                />
            </div>
        </div>
    );
};

export default VerifyEmail