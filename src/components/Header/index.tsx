import Logo from "@/assets/logo.png";

export const Header = () => {
  return (
    <div className="bg-[#55B3F3] w-full flex flex-row items-center justify-between p-1 h-16 overflow-hidden">
      <img src={Logo} className="w-[70px] ml-3" />
      <div className="mr-3 text-white">
        <pre>PVM debugger</pre>
      </div>
    </div>
  );
};
