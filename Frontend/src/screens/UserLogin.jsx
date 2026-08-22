import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button, Heading, Input } from "../components";
import axios from "axios";
import Console from "../utils/console";

function UserLogin() {
  const [responseError, setResponseError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const navigation = useNavigate();

  const loginUser = async (data) => {
    if (data.email.trim() !== "" && data.password.trim() !== "") {
      try {
        setLoading(true);
        const response = await axios.post(
          `${import.meta.env.VITE_SERVER_URL}/user/login`,
          data
        );
        Console.log(response);
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("userData", JSON.stringify({
          type: "user",
          data: response.data.user,
        }));
        navigation("/home");
      } catch (error) {
        setResponseError(error.response.data.message);
        Console.log(error);
      } finally {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setTimeout(() => {
      setResponseError("");
    }, 5000);
  }, [responseError]);
  return (
    <div className="w-full h-dvh flex flex-col justify-between p-4 pt-6 md:h-auto md:max-w-md md:mx-auto md:my-12 md:rounded-2xl md:shadow-xl md:border md:border-zinc-100 md:p-8 md:justify-start md:gap-6">
      <div>
        <Heading title={"Đăng nhập Người dùng🧑🏻"} />
        <form onSubmit={handleSubmit(loginUser)}>
          <Input
            label={"Email"}
            type={"email"}
            name={"email"}
            register={register}
            error={errors.email}
          />
          <Input
            label={"Mật khẩu"}
            type={"password"}
            name={"password"}
            register={register}
            error={errors.password}
          />
          {responseError && (
            <p className="text-sm text-center mb-4 text-red-500">
              {responseError}
            </p>
          )}
          <Link to="/user/forgot-password" className="text-sm mb-2 inline-block">
            Quên mật khẩu?
          </Link>
          <Button title={"Đăng nhập"} loading={loading} type="submit" />
        </form>
        <p className="text-sm font-normal text-center mt-4">
          Chưa có tài khoản?{" "}
          <Link to={"/signup"} className="font-semibold">
            Đăng ký
          </Link>
        </p>

      </div>
      <div>
        <Button
          type={"link"}
          path={"/captain/login"}
          title={"Đăng nhập với vai trò Tài xế"}
          classes={"bg-orange-500"}
        />
        <p className="text-xs font-normal text-center self-end mt-6">
          Trang này được bảo vệ bởi reCAPTCHA và áp dụng{" "}
          <span className="font-semibold underline">Chính sách quyền riêng tư</span> và{" "}
          <span className="font-semibold underline">Điều khoản dịch vụ</span>{" "}
          của Google.
        </p>
      </div>
    </div>
  );
}

export default UserLogin;
