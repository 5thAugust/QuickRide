import { Button } from "../components";
import { useNavigate } from "react-router-dom";

const Error = () => {
  const navigate = useNavigate();
  return (
    <div className="w-full h-dvh flex items-center text-center p-4 md:h-auto md:max-w-md md:mx-auto md:my-12 md:rounded-2xl md:shadow-xl md:border md:border-zinc-100 md:p-8 md:justify-center">
      <div className="">
        <h1 className="text-6xl font-bold">404</h1>

        <h2 className="text-3xl font-semibold">Không tìm thấy trang</h2>
        <p className="text-gray-600 my-6">
          Trang bạn đang tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <Button
          title="Về trang chủ"
          classes="bg-orange-500"
          fun={() => navigate("/")}
        />
      </div>
    </div>
  );
};

export default Error;
