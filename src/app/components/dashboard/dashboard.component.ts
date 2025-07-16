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
    console.log("CSV options changed:", options)
    this.csvOptions = { ...options }
  }

  sendToBackend(): void {
    if (this.jsonData.length === 0) {
      alert("No data to send. Please upload a file first.")
      return
    }

    const batchSize = 50000;
    const totalBatches = Math.ceil(this.jsonData.length / batchSize);


    console.log("Sending data to MongoDB:", this.jsonData)

    for (let i = 0; i < totalBatches; i++) {
      const batch = this.jsonData.slice(i * batchSize, (i + 1) * batchSize);
      this.databaseService.saveCsvData(batch).subscribe({
        next: (response) => {
          console.log("Data saved successfully:", response)
          alert(
            `Success! Saved ${response.insertedIds ? Object.keys(response.insertedIds).length : "unknown"} records to MongoDB`,
          )
        },
        error: (error) => {
          console.error("Error saving data:", error)
          alert("Error saving data to database: " + error.message)
        },
      })
    }
    
  }
}
