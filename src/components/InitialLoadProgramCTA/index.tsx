import Arrow from "@/assets/arrow.png";

export const InitialLoadProgramCTA = () => {
  return (
    <div className="border-2 rounded-md h-full flex justify-start flex-row items-start gap-3 pt-6">
      <img src={Arrow} alt="" className="w-[70px] rotate-[17deg] ml-4" />
      <p className="mt-[20px] font-semibold">Start jamming with PVM.</p>
    </div>
  );
};
