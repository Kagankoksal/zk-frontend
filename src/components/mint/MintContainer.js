import "../../vouched-css-customization.css";
import "react-phone-number-input/style.css";
import RoundedWindow from "../RoundedWindow";
import Progress from "../atoms/progress-bar";

const MintContainer = ({ steps, currentIdx, children }) => {
  return (
    <RoundedWindow>
      <div className="spacer-medium" />
      <Progress steps={steps} currentIdx={currentIdx} />
      <div 
        style={{
          position: "relative",
          paddingTop: "100px",
          width: "100%",
          height: "90%",
          display: "flex",
          alignItems: "center",
          justifyContent: "start",
          flexDirection: "column",
        }}
      >
        {children}
      </div>
    </RoundedWindow>
  );
};

export default MintContainer;
