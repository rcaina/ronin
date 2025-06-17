//this page needs to show the details of a budget

const BudgetDetailsPage = () => {
  return (
    <div>
      <h1>Budget Details</h1>
      {/**show the budget name and amount limit with amount left to spend and created date on top right*/}
      <div className="flex justify-between">
        <h3 className="text-lg font-bold">Budget Name</h3>
        <p className="text-sm text-gray-500">
          Created: {new Date().toLocaleDateString()}
        </p>
      </div>
      <div className="flex gap-4">
        <p className="text-sm text-gray-500">Limit: {1000}</p>
        <p className="text-sm text-gray-500">Spent: {1000}</p>
      </div>
    </div>
  );
};

export default BudgetDetailsPage;
