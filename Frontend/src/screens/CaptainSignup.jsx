import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import { Button, Heading, Input } from "../components";
import axios from "axios";
import { ArrowLeft, ChevronRight } from "lucide-react";
import Console from "../utils/console";

function CaptainSignup() {
  const [responseError, setResponseError] = useState("");
  const [showVehiclePanel, setShowVehiclePanel] = useState(false);
  const [loading, setLoading] = useState(false);

  const {
    handleSubmit,
    register,
    formState: { errors },
  } = useForm();

  const navigation = useNavigate();
  const signupCaptain = async (data) => {

    const captainData = {
      fullname: {
        firstname: data.firstname,
        lastname: data.lastname,
      },
      email: data.email,
      password: data.password,
      phone: data.phone,
      vehicle: {
        color: data.color,
        number: data.number,
        capacity: data.capacity,
        type: data.type,
      },
    };
    Console.log(captainData);

    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_SERVER_URL}/captain/register`,
        captainData
      );
      Console.log(response);
      localStorage.setItem("token", response.data.token);
      navigation("/captain/home");
    } catch (error) {
      setResponseError(
        error.response.data[0]?.msg || error.response.data.message
      );
      setShowVehiclePanel(false);
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
        <Heading title={"Đăng ký Tài xế🚕"} />
        <form onSubmit={handleSubmit(signupCaptain)}>
          {!showVehiclePanel && (
            <>
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
              <div
                className={`cursor-pointer flex justify-center items-center gap-2 py-3 font-semibold bg-black text-white w-full rounded-lg`}
                onClick={() => {
                  setShowVehiclePanel(true);
                }}
              >
                Tiếp theo <ChevronRight strokeWidth={2.5} />
              </div>
            </>
          )}
          {showVehiclePanel && (
            <>
              <ArrowLeft
                onClick={() => {
                  setShowVehiclePanel(false);
                }}
                className="cursor-pointer -ml-1 mb-4"
              />
              <div className="flex gap-4 -my-2">
                <Input
                  label={"Màu xe"}
                  name={"color"}
                  register={register}
                  error={errors.color}
                />
                <Input
                  label={"Số chỗ ngồi"}
                  type={"number"}
                  name={"capacity"}
                  register={register}
                  error={errors.capacity}
                />
              </div>
              <Input
                label={"Biển số xe"}
                name={"number"}
                register={register}
                error={errors.number}
              />
              <Input
                label={"Loại xe"}
                type={"select"}
                options={[
                  { value: "car", label: "Xe hơi" },
                  { value: "bike", label: "Xe máy" },
                ]}
                name={"type"}
                register={register}
                error={errors.type}
              />

              {responseError && (
                <p className="text-sm text-center mb-4 text-red-500">
                  {responseError}
                </p>
              )}
              <Button title={"Đăng ký"} loading={loading} type="submit" />
            </>
          )}
        </form>
        <p className="text-sm font-normal text-center mt-4">
          Đã có tài khoản?{" "}
          <Link to={"/captain/login"} className="font-semibold">
            Đăng nhập
          </Link>
        </p>
      </div>
      <div>
        <Button
          type={"link"}
          path={"/signup"}
          title={"Đăng ký với vai trò Người dùng"}
          classes={"bg-green-500"}
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

export default CaptainSignup;
