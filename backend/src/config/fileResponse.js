const ExcelJS = require("exceljs");
const { Parser } = require("json2csv");



function sendJsonFile(res, data, filename) {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
  res.status(200).send(JSON.stringify(data, null, 2));
}

function sendCsvFile(res, data, filename) {
  const rows = Object.entries(data).map(([k, v]) => ({
    metric: k,
    value: typeof v === "object" ? JSON.stringify(v) : v
  }));
  const csv = new Parser({ fields: ["metric", "value"] }).parse(rows);
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
  res.status(200).send(csv);
}


async function savingSendXlsxFile(res, data, filename) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Savings Stats");

  // Define columns with headers
  ws.columns = [
    { header: "IPSS Number", key: "ipssNumber", width: 15 },
    { header: "FullName", key: "userName", width: 25 },
    { header: "Last Updated", key: "lastUpdated", width: 25 },
    { header: "Total Balance", key: "totalAmount", width: 15 },
    { header: "Transaction Type", key: "transactionType", width: 20 },
    { header: "Transaction Amount", key: "transactionAmount", width: 20 },
    { header: "Transaction Date", key: "transactionDate", width: 25 },
  ];

  // Populate rows
  for (const record of data) {
    const baseRow = {
      ipssNumber: record.ipssNumber || "",
      userName: record.user?.fullName || "",
      lastUpdated: new Date(record.lastUpdated).toLocaleString(),
      totalAmount: record.totalAmount || "",
    };

    if (record.transaction && record.transaction.length > 0) {
      for (const t of record.transaction) {
        ws.addRow({
          ...baseRow,
          transactionType: t.type,
          transactionAmount: t.amount,
          transactionDate: new Date(t.date).toLocaleString(),
        });
      }
    } else {
      // No transaction
      ws.addRow(baseRow);
    }
  }

  // Send the file
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  await wb.xlsx.write(res);
  res.end();
}



async function sendLoanXlsxFile(res, loans, filename) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Loans");

  // Base headers
  const headers = [
    "Full Name",
    "IPSS Number",
    "Loan Amount",
    "Term (Months)",
    "Status",
    "Total Interest",
    "Repayment Amount",
    "Installments",
    "Final Installment",
    "Created At",
    "Updated At",
  ];

  // Add header to worksheet
  ws.addRow(headers);

  // Add each loan as a row
  for (const loan of loans) {
    const row = [
      loan.fullName,
      loan.ipssNumber,
      loan.amount,
      loan.term_month,
      loan.status,
      loan.totalInterestAmount,
      loan.repaymentAmount,
      loan.recurringFee,
      loan.finalPayment,
      new Date(loan.createdAt).toLocaleString(),
      new Date(loan.updatedAt).toLocaleString(),
    ];


    ws.addRow(row);
  }

  // Adjust column widths
  ws.columns.forEach((col) => {
    col.width = 20;
  });

  // Set headers for file download
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${filename}.xlsx"`
  );
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );

  await wb.xlsx.write(res);
  res.end();
}



async function sendGeneralStatsXlsxFile(res, data, filename) {
  const wb = new ExcelJS.Workbook();

  // 1. Summary Sheet
  const summarySheet = wb.addWorksheet("Summary");
  summarySheet.columns = [
    { header: "Metric", key: "metric", width: 30 },
    { header: "Value", key: "value", width: 30 }
  ];
  Object.entries(data.summary).forEach(([key, value]) => {
    summarySheet.addRow({ metric: key, value });
  });

  // 2. Users Sheet
  const usersSheet = wb.addWorksheet("Users");
  usersSheet.columns = [
    { header: "Full Name", key: "fullName", width: 30 },
    { header: "Role", key: "role", width: 15 },
    { header: "IPSS Number", key: "ipssNumber", width: 20 },
    { header: "Phone Number", key: "phoneNumber", width: 20 },
    { header: "Created At", key: "createdAt", width: 30 }
  ];
  data.users.forEach(user => usersSheet.addRow({
    fullName: user.fullName,
    role: user.role,
    ipssNumber: user.ipssNumber,
    phoneNumber: user.phoneNumber,
    createdAt: new Date(user.createdAt).toLocaleString()
  }));

  // 3. Savings Sheet
  const savingsSheet = wb.addWorksheet("Savings");
  savingsSheet.columns = [
    { header: "Full Name", key: "fullName", width: 30 },
    { header: "IPSS Number", key: "ipssNumber", width: 20 },
    { header: "Total Balance", key: "totalAmount", width: 20 },
    { header: "Last Updated", key: "lastUpdated", width: 30 },
    { header: "Transaction Type", key: "type", width: 20 },
    { header: "Amount", key: "amount", width: 15 },
    { header: "Date", key: "date", width: 30 }
  ];
  data.savings.forEach(saving => {
    saving.transaction.forEach(tx => {
      savingsSheet.addRow({
        fullName: saving.user?.fullName || "",
        ipssNumber: saving.ipssNumber,
        totalAmount: saving.totalAmount,
        lastUpdated: new Date(saving.lastUpdated).toLocaleString(),
        type: tx.type,
        amount: tx.amount,
        date: new Date(tx.date).toLocaleString()
      });
    });
  });

  // === Loan Sheet ===
  const loanSheet = wb.addWorksheet("Loan");

  // Base headers
  const loanHeaders = [
    "Full Name",
    "IPSS Number",
    "Loan Amount",
    "Term (Months)",
    "Status",
    "Total Interest",
    "Repayment Amount",
    "Installments",
    "Final Installment",
    "Created At",
    "Updated At",
  ];

  loanSheet.addRow(loanHeaders);

  // Add each loan as a row
  for (const loan of data.loans) {
    const row = [
      loan.fullName,
      loan.ipssNumber,
      loan.amount,
      loan.term_month,
      loan.status,
      loan.totalInterestAmount,
      loan.repaymentAmount,
      loan.recurringFee,
      loan.finalPayment,
      new Date(loan.createdAt).toLocaleString(),
      new Date(loan.updatedAt).toLocaleString(),
    ];

    loanSheet.addRow(row);
  }

  // Adjust column widths
  loanSheet.columns.forEach((col) => {
    col.width = 20;
  });
  
  // Finalize response
  res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
  res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
  await wb.xlsx.write(res);
  res.end();
}



module.exports = {

    sendJsonFile,
    sendCsvFile,
    savingSendXlsxFile,
    sendLoanXlsxFile,
    sendGeneralStatsXlsxFile
}
