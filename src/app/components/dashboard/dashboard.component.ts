import { Component, type OnInit } from "@angular/core"
import { AuthService, User } from "../../services/auth.service"
import { DatabaseService } from "../../services/database.service"
import {Router} from "@angular/router"
import { TxtToJsonOptions } from "src/app/services/txt-to-json.service"
import { CsvOptions } from "src/app/services/csv-converter.service"


interface TableData {
  [key: string]: any
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

  currentFileType: "csv" | "txt" | null = null

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

  txtOptions: TxtToJsonOptions = {
    fieldCount: 3,
    startPositions: [0, 10, 20],
    lengths: [10, 10, 10],
    hasHeader: true,
    skipEmptyLines: true,
  }

  // TXT-specific UI properties (similar to csv-uploader)
  txtFieldConfigs: Array<{ start: number; length: number }> = [
    { start: 0, length: 10 },
    { start: 10, length: 10 },
    { start: 20, length: 10 },
  ]
  selectedFieldIndex = 0


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
  onFileConverted(result: any): void {
    console.log("File converted successfully:", result)
    this.jsonData = result.result
    this.tableHeaders = result.properties
    console.log("Data ready for backend:", this.jsonData)
  }

  onConversionError(error: string): void {
    console.error("File conversion failed:", error)
    alert("Error: " + error)
    this.jsonData = []
    this.tableHeaders = []
  }

  onFileClear(): void {
    console.log("File selection cleared - resetting table data")
    this.jsonData = []
    this.tableHeaders = []
    this.searchTerm = ""
    this.currentFileType = null
    console.log("Table data cleared successfully")
  }

  onOptionsChanged(options: any): void {
    console.log("Options changed:", options)

    // If the options contain CSV-specific properties, update CSV options
    if (options.selectedDelimiter !== undefined) {
      this.csvOptions = { ...options }
      this.currentFileType = "csv"
    }

    // If the options contain TXT-specific properties, update TXT options
    if (options.fieldCount !== undefined) {
      this.txtOptions = { ...options }
      this.currentFileType = "txt"

      // Update UI field configs if they exist in options
      if (options.startPositions && options.lengths) {
        this.txtFieldConfigs = options.startPositions.map((start: number, index: number) => ({
          start: start,
          length: options.lengths[index] || 10,
        }))
      }
    }
  }

  // Helper method to get current options based on file type
  getCurrentOptions(): CsvOptions | TxtToJsonOptions {
    return this.currentFileType === "txt" ? this.txtOptions : this.csvOptions
  }

  // Helper method to check if current file is TXT
  get isTxtFile(): boolean {
    return this.currentFileType === "txt"
  }

  // Helper method to check if current file is CSV
  get isCsvFile(): boolean {
    return this.currentFileType === "csv"
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
                console.log(`File type: ${this.currentFileType}`)
                console.log(`Current options:`, this.getCurrentOptions())
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
