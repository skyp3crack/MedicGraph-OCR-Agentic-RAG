"use client";

import React, { useState } from 'react';

// Define the shape of our data based on the Pydantic schemas
interface ICD11CodingEntry {
    diagnosis_text: string;
    icd11_code: string;
}

interface SmrpIcd11CodingPayload {
    main_diagnosis: ICD11CodingEntry[];
    other_diagnosis: ICD11CodingEntry[];
    complication_diagnosis: ICD11CodingEntry[];
    external_causes_of_morbidity: ICD11CodingEntry[];
}

interface HITLDashboardProps {
    initialData: SmrpIcd11CodingPayload | null;
    onApprove: (data: SmrpIcd11CodingPayload) => void;
    onReject: () => void;
}

export default function HITLDashboard({
    initialData,
    onApprove,
    onReject,
}: HITLDashboardProps) {
    const [editableData, setEditableData] = useState<SmrpIcd11CodingPayload | null>(initialData);

    if (!editableData) {
        return <div className="">Waiting for extraction data...</div>;
    }

    //generic handler for text input changes
    const handleInputChange = (category: keyof SmrpIcd11CodingPayload, index: number, field: keyof ICD11CodingEntry, value: string) => {
        const updatedCategory = [...editableData[category]];
        updatedCategory[index] = { ...updatedCategory[index], [field]: value };
        setEditableData({ ...editableData, [category]: updatedCategory });
    };

    const renderDiagnosisSection = (title: string, category: keyof SmrpIcd11CodingPayload, maxItems: number) => {
        const items = editableData[category];

        return (
            <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
                <h3 className="">
                    {title}
                    <span className=""></span>
                </h3>
                {items.length === 0 ? (
                    <div className="">No entries</div>
                ) : (
                    <div className="">
                        {items.map((item, index) => (
                            <div key={index} className="">
                                <div className="">
                                    <label className=""></label>
                                    <input
                                        type="text"
                                        value={item.diagnosis_text}
                                        onChange={(e) => handleInputChange(category, index, 'diagnosis_text', e.target.value)}
                                        className=""
                                    />
                                    <input
                                        type="text"
                                        value={item.icd11_code}
                                        onChange={(e) => handleInputChange(category, index, 'icd11_code', e.target.value)}
                                        className=""
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="mb-8 border-b border-gray-200 pb-4 flex justify-between items-end">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900">Clinical Verification Required</h2>
                    <p className="text-sm text-gray-600 mt-1">Review the AI-extracted diagnostic codes before final submission to SMRP.</p>
                </div>
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 px-3 py-1 rounded-full text-sm font-medium border border-amber-200">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                    Awaiting Human Review
                </div>
            </div>

            {renderDiagnosisSection("Main Diagnosis (Mandatory)", "main_diagnosis", 1)}
            {renderDiagnosisSection("Other Diagnoses", "other_diagnosis", 10)}
            {renderDiagnosisSection("Complication Diagnoses", "complication_diagnosis", 10)}
            {renderDiagnosisSection("External Causes of Morbidity", "external_causes_of_morbidity", 10)}

            <div className="mt-8 flex justify-end gap-4 pt-4 border-t border-gray-200">
                <button
                    onClick={onReject}
                    className="px-6 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                    Reject & Flag Error
                </button>
                <button
                    onClick={() => onApprove(editableData)}
                    className="px-6 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm transition-colors flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                    Approve & Submit to SMRP
                </button>
            </div>
        </div>
    );
}

