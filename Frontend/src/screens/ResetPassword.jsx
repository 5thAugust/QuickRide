import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button, Input } from '../components';
import { useState } from 'react';
import { useForm } from "react-hook-form";
import Console from '../utils/console';
import axios from 'axios';
import { useAlert } from '../hooks/useAlert';
import { Alert } from '../components';
import password_image from '/password.svg'

const allowedParams = ["user", "captain"];

function ResetPassword() {
    const [loading, setLoading] = useState(false);

    const [searchParams] = useSearchParams();
    const token = searchParams.get("token");

    const { userType } = useParams();
    const navigate = useNavigate();
    const {
        handleSubmit,
        register,
        formState: { errors },
    } = useForm();

    const { alert, showAlert, hideAlert } = useAlert();

    if (!allowedParams.includes(userType)) {
        return <Navigate to={'/not-found'} replace />
    }

    const resetPassword = async (data) => {
        if(data.password.length < 8 || data.confirmPassword.length < 8 ){
            showAlert("Độ dài mật khẩu không hợp lệ", "Mật khẩu phải có ít nhất 8 ký tự", 'failure')
            return;
        }
        if (data.password !== data.confirmPassword) {
            showAlert("Mật khẩu không khớp", "Mật khẩu và xác nhận mật khẩu phải giống nhau. Vui lòng nhập lại", 'failure')
            return;
        }
        try {
            setLoading(true)
            const response = await axios.post(
                `${import.meta.env.VITE_SERVER_URL}/${userType}/reset-password`,
                {
                    token: token,
                    password: data.password
                }
            );
            showAlert('Đặt lại mật khẩu thành công!', response.data.message, 'success');
            Console.log(response);
            setTimeout(() => {
                navigate('/')
            }, 5000)
        } catch (error) {
            showAlert('Đã xảy ra lỗi!', error.response.data.message, 'failure');
            setTimeout(() => {
                navigate('/' + userType + '/forgot-password')
            }, 5000);
            Console.log(error);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="w-full h-dvh flex flex-col p-4 pt-6 md:h-auto md:max-w-md md:mx-auto md:my-12 md:rounded-2xl md:shadow-xl md:border md:border-zinc-100 md:p-8">
            <Alert
                heading={alert.heading}
                text={alert.text}
                isVisible={alert.isVisible}
                onClose={hideAlert}
                type={alert.type}
            />
            <h1 className="text-2xl font-bold">Tạo mật khẩu mới</h1>
            <img className='w-60 mx-auto' src={password_image} alt="Password Image" />
            <form onSubmit={handleSubmit(resetPassword)}>
                <Input
                    label={"Mật khẩu mới"}
                    type={"password"}
                    name={"password"}
                    register={register}
                    error={errors.password}
                />
                <Input
                    label={"Xác nhận mật khẩu"}
                    type={"password"}
                    name={"confirmPassword"}
                    register={register}
                    error={errors.confirmPassword}
                />
                <Button title={"Đặt lại mật khẩu"} loading={loading} type="submit" />
            </form>
        </div>
    )
}

export default ResetPassword