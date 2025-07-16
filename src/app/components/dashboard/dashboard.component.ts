import { Component, type OnInit } from "@angular/core"
import { AuthService, User } from "../../services/auth.service"
import { DatabaseService } from "../../services/database.service"
import {Router} from "@angular/router"
// Interface to define the structure of our data
interface TableData {
  [key: string]: any
}

// Interface for CSV parsing options
interface CsvOptions {
  hasHeader: boolean
  skipEmptyLines: boolean
  selectedDelimiter: string
  doubleQuoteWrap: boolean
  selectedRowDelimiter: string
  rowPrefix: string
  rowSuffix: string
  selectedEncoding: string
  selectedQuoteOption: string
  trimWhitespace: boolean
}

@Component({
  selector: "app-dashboard",
  templateUrl: "./dashboard.component.html",
  styleUrls: ["./dashboard.component.scss"],
})
export class DashboardComponent implements OnInit {
  currentUser: User | null = null

  // CSV data properties
  jsonData: TableData[] = []
  tableHeaders: string[] = []
  searchTerm = ""
  csvOptions: CsvOptions = {
    hasHeader: true,
    skipEmptyLines: true,
    selectedDelimiter: ",",
    doubleQuoteWrap: true,
    selectedRowDelimiter: "newline",
    rowPrefix: "",
    rowSuffix: "",
    selectedEncoding: "utf-8",
    selectedQuoteOption: "none",
    trimWhitespace: true,
  }

  constructor(
    private authService: AuthService,
    private databaseService: DatabaseService,
    private router: Router,
  ) {}

  ngOnInit(): void {
    this.currentUser = this.authService.getCurrentUser()

    if (!this.currentUser) {
      this.router.navigate(["/login"])
    }
  }

  logout(): void {
    this.authService.logout()
    this.router.navigate(["/login"])
  }

  // CSV handling methods
  onCsvConverted(result: any): void {
    console.log("CSV converted successfully:", result)
    this.jsonData = result.result
    this.tableHeaders = result.properties
    console.log("Data ready for backend:", this.jsonData)
  }

  onConversionError(error: string): void {
    console.error("CSV conversion failed:", error)
    alert("Error: " + error)
    this.jsonData = []
    this.tableHeaders = []
  }

  onFileClear(): void {
    console.log("File selection cleared - resetting table data")
    this.jsonData = []
    this.tableHeaders = []
    this.searchTerm = ""
    console.log("Table data cleared successfully")
  }

  onOptionsChanged(options: CsvOptions): void {
    console.log(" Options changed:", options)
    this.csvOptions = { ...options }
  }

  sendToBackend(): void {
    if (!this.jsonData || this.jsonData.length === 0) {
        alert("No data to send. Please upload a file first.");
        return;
    }

    const batchSize = 50000;
    const totalBatches = Math.ceil(this.jsonData.length / batchSize);
    console.log(`Starting to send ${this.jsonData.length} records in ${totalBatches} batches.`);

    const sendBatch = (batchIndex: number): void => {
        if (batchIndex >= totalBatches) {
            alert(" All data sent successfully to MongoDB!");
            return;
        }

        const start = batchIndex * batchSize;
        const end = start + batchSize;
        const batch = this.jsonData.slice(start, end);

        this.databaseService.saveCsvData(batch).subscribe({
            next: (response) => {
                const savedCount = response?.insertedIds
                    ? Object.keys(response.insertedIds).length
                    : batch.length;

                console.log(`Batch ${batchIndex + 1}/${totalBatches} sent. Saved ${savedCount} records.`);
                // Sonraki batch'e geç
                sendBatch(batchIndex + 1);
            },
            error: (error) => {
                console.error(`Error in batch ${batchIndex + 1}:`, error);
                alert("Error saving data to database: " + error.message);
            }
        });
    };

    // İlk batch'i başlat
    sendBatch(0);
}
}
