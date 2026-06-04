"use client";
import HITLDashboard from "./components/HITLDashboard"

// In reality, this data will come from a fetch() call to from FastAPI backend
// after the LangGraph execution hits the interrupt point.
const mockExtractedData = {
  main_diagnosis: [
    { diagnosis_text: "Sepsis secondary to e.coli infection", icd11_code: "1D01" }
  ],
  other_diagnosis: [
    { diagnosis_text: "Type 2 diabetes mellitus", icd11_code: "5A11" },
    { diagnosis_text: "Essential hypertension", icd11_code: "BA00" }
  ],
  complication_diagnosis: [],
  external_causes_of_morbidity: []
};

const handleApprove = (finalData: any) => {
  console.log("Submitting approved data to backend to resume LangGraph:", finalData);
  // Here you would send a POST request back to FastAPI to resume the graph
  alert("Data Approved! Resuming workflow...");
};

const handleReject = () => {
  console.log("Review rejected.");
  alert("Review rejected. Graph workflow halted.");
};


export default function Home() {
  return (
    <main className="min-h-screen bg-gray-100 p-8">
      <HITLDashboard
        initialData={mockExtractedData}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </main>
  );
}
