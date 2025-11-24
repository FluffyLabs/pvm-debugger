import Arrow from "@/assets/arrow.png";

export const InitialLoadProgramCTA = () => {
  return (
    <div className="border-2 rounded-md h-full flex justify-start flex-row items-start gap-3 pt-6">
      <div className="max-sm:hidden">
        <img src={Arrow} alt="" className="w-[70px] rotate-17 ml-4" />
      </div>
      <p className="max-sm:hidden md:mt-[20px] font-semibold">Start jamming with PVM.</p>

      <div className="md:hidden mb-3 self-end" style={{ transform: "rotateX(180deg)" }}>
        <img src={Arrow} alt="" className="w-[70px] rotate-17 ml-4" />
      </div>
      <p className="md:hidden md:mt-[20px] font-semibold self-end pb-8">Start jamming with PVM.</p>
    </div>
  );
};
