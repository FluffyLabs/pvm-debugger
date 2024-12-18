import { Loader } from "@/components/ProgramLoader/Loader.tsx";

const ProgramLoader = () => {
  return (
    <div className="col-span-12 flex justify-center h-[50vh] align-middle">
      <div className="min-w-[50vw] max-md:w-[100%] min-h-[500px] h-[75vh] flex flex-col">
        <Loader />
      </div>
    </div>
  );
};

export default ProgramLoader;
