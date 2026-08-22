import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button, Heading, Input } from "../components";
import axios from "axios";
import Console from "../utils/console";

function UserSignup() {
  const [responseError, setResponseError] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const navigation = useNavigate();
  const signupUser = async (data) => {
    const userData = {
      fullname: {
        firstname: data.firstname,
        lastname: data.lastname,
      },
      email: data.email,
      password: data.password,
      phone: data.phone
    };

    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/user/register`,
        userData
      );
      Console.log(response);
      localStorage.setItem("token", response.data.token);
      navigation("/home");
    } catch (error) {
      setResponseError(error.response.data[0].msg);
      Console.log(error);
    } finally {
      setLoading(false);
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
        <Heading title={"Đăng ký Người dùng🧑🏻"} />
        <form onSubmit={handleSubmit(signupUser)}>
          <div className="flex gap-4 -mb-2">
            <Input
              label={"Tên"}
              name={"firstname"}
              register={register}
              error={errors.firstname}
            />
            <Input
              label={"Họ"}
              name={"lastname"}
              register={register}
              error={errors.lastname}
            />
          </div>
          <Input
            label={"Số điện thoại"}
            type={"number"}
            name={"phone"}
            register={register}
            error={errors.phone}
          />
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
          <Button title={"Đăng ký"} loading={loading} type="submit" />
        </form>
        <p className="text-sm font-normal text-center mt-4">
          Đã có tài khoản?{" "}
          <Link to={"/login"} className="font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
      <div>
        <Button
          type={"link"}
          path={"/captain/signup"}
          title={"Đăng ký với vai trò Tài xế"}
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

export default UserSignup;
