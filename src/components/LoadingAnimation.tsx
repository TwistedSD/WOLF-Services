import React, { ReactNode } from 'react';

interface LoadingAnimationProps {
  position?: 'horizontal' | 'vertical' | 'diagonal';
  children: ReactNode;
}

const LoadingAnimation: React.FC<LoadingAnimationProps> = ({ position = 'diagonal', children }) => {
  const renderBoxes = () => {
    const boxes = [];
    for (let i = 0; i < 6; i++) {
      boxes.push(
        <div
          key={i}
          className="h-2 w-2 animated-box"
          style={{ animationDelay: `${0.5 * i}s` }}
        />
      );
    }
    return boxes;
  };

  const styleProps = {
    left: 'flex-col-reverse',
    rightPosition: 'top-0',
    right: 'flex-col',
  };

  return (
    <div className="relative">
      <div className="absolute -ml-6 bottom-0 cursor-default">
        <div className={`flex ${styleProps.left} gap-1`}>
          {renderBoxes()}
        </div>
      </div>
      {children}
      <div className={`absolute right-0 -mr-6 bottom-0 cursor-default ${styleProps.rightPosition}`}>
        <div className={`flex ${styleProps.right} gap-1`}>
          {renderBoxes()}
        </div>
      </div>
    </div>
  );
};

export default LoadingAnimation;
