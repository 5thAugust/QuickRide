import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button, Input } from '../components';
import { useState } from 'react';
import { useForm } from "react-hook-form";
import Console from '../utils/console';
import axios from 'axios';
import useCooldownTimer from '../hooks/useCooldownTimer';
import mailImg from "/mail.png";
import { ArrowLeft } from 'lucide-react';
import { useAlert } from '../hooks/useAlert';
import { Alert } from '../components';

const allowedParams = ["user", "captain"];

function ForgotPassword() {
    const [loading, setLoading] = useState(false);
    // const alert
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm();

    const navigation = useNavigate();
    const { userType } = useParams();
    const { alert, showAlert, hideAlert } = useAlert();
    const { timeLeft, isActive, startCooldown } = useCooldownTimer(60000, 'forgot-password-cooldown');

    if (!allowedParams.includes(userType)) {
        return <Navigate to={'/not-found'} replace />
    }

    const forgotPassword = async (data) => {
        if (data.email.trim() !== "") {
            try {
                setLoading(true);
                const response = await axios.post(
                    `${import.meta.env.VITE_SERVER_URL}/mail/${userType}/reset-password`,
                    data
                );
                Console.log(response);
                showAlert('Gửi email đặt lại mật khẩu thành công!', 'Vui lòng kiểm tra hộp thư và nhấp vào liên kết nhận được để đặt lại mật khẩu', 'success');
                startCooldown();

            } catch (error) {
                showAlert('Đã xảy ra lỗi', error.response.data.message, 'failure');
                Console.log(error.response.data.message);
            } finally {
                setLoading(false);
            }
        }
    }

    const getButtonTitle = () => {
        if (isActive) {
            return `Đợi ${timeLeft}s`;
        }
        return "Đặt lại mật khẩu";
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
            </div>
            <div className="px-2">
                <h1 className="text-2xl font-bold">Quên mật khẩu?</h1>
                <p className="text-sm mt-3 text-zinc-600 text-balance">
                    Nhập email đã đăng ký bên dưới để nhận liên kết đặt lại mật khẩu
                </p>
                <img src={mailImg} alt="Verify Email" className="h-36 mx-auto my-8" />

                <form onSubmit={handleSubmit(forgotPassword)}>
                    <Input
                        placeholder={"example@gmail.com"}
                        type={"email"}
                        name={"email"}
                        register={register}
                        error={errors.email}
                    />

                    <Button
                        title={getButtonTitle()}
                        loading={loading}
                        loadingMessage={"Đang gửi..."}
                        type="submit"
                        disabled={loading || isActive}
                    />
                </form>
            </div>
        </div>
    )
}

export default ForgotPassword