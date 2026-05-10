interface TestProps {
  items: any[];
}

const Test: React.FC<TestProps> = ({ items }) => {
  return (
    <div>
      {items.map((item) => (
        <div>
          <div>Item: {item.name}</div>
        </div>
      ) }
    </div>
  );
};

export default Test;