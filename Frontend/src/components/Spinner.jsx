function Spinner({scale}) {
  return (
    <div>
      <img
        src="/Spinner.svg"
        className={`w-6 h-6 scale-${scale}`}
      />
    </div>
  );
}
export default Spinner;
