import { Component, EventEmitter, Inject, Output } from "@angular/core"
import { CsvConverterService, CsvOptions } from "src/app/services/csv-converter.service"
import { TxtToJsonService, TxtToJsonOptions } from "src/app/services/txt-to-json.service"

@Component({
  selector: "app-file-uploader",
  templateUrl: "./file-uploader.component.html",
  styleUrls: ["./file-uploader.component.scss"],
})
export class FileUploaderComponent {
  // Output events to communicate with parent component
  @Output() onConvert = new EventEmitter<any>()
  @Output() onError = new EventEmitter<string>()
  @Output() onFileClear = new EventEmitter<void>()
  @Output() onOptionsChange = new EventEmitter<any>()

  // Track selected file and upload state
  selectedFile: File | null = null
  isProcessing = false
  hasHeader = true // default to true
  skipEmptyLines = true // default to true (skip empty lines)
  selectedDelimiter = ","
  doubleQuoteWrap = true
  selectedRowDelimiter = "newline" // default to newline
  rowPrefix = ""
  rowSuffix = ""
  selectedEncoding = "utf-8"
  selectedQuoteOption = "none"
  trimWhitespace = true
  fileType: "csv" | "txt" | null = null

  fieldCount = 3
  selectedFieldIndex = 0
  fieldConfigs: Array<{ start: number; length: number }> = [
    { start: 0, length: 10 },
    { start: 10, length: 10 },
    { start: 20, length: 10 },
  ]

  constructor(
    private csvService: CsvConverterService,
    @Inject(TxtToJsonService) private txtService: TxtToJsonService,
  ) {}

  // Delimiter options for the dropdown
  delimiterOptions = [
    { value: ",", label: "Comma (,)" },
    { value: ";", label: "Semicolon (;)" },
    { value: "|", label: "Pipe (|)" },
    { value: ":", label: "Colon (:)" },
    { value: "\t", label: "Tab" },
    { value: "/", label: "Slash (/)" },
    { value: "#", label: "Hash (#)" },
  ]

  // Row delimiter options for the dropdown
  rowDelimiterOptions = [
    { value: "newline", label: "Newline (\\n)" },
    { value: "carriage-return", label: "Carriage Return(\\r)" },
    { value: "crlf", label: "Carriage Return + Newline (\\r\\n)" },
    { value: ",", label: "Comma (,)" },
    { value: ";", label: "Semicolon (;)" },
    { value: "|", label: "Pipe (|)" },
    { value: ":", label: "Colon (:)" },
    { value: "\t", label: "Tab" },
    { value: "/", label: "Slash (/)" },
    { value: "#", label: "Hash (#)" },
  ]
  // Encoding options for the dropdown
  encodingOptions = [
    { value: "utf-8", label: "UTF-8" },
    { value: "utf-8-bom", label: "UTF-8 with BOM" },
    { value: "windows-1254", label: "Windows-1254 (Turkish)" },
    { value: "iso-8859-9", label: "ISO-8859-9 (Turkish)" },
  ]

  // Quote handling options
  quoteOptions = [
    { value: "none", label: "None (No Quote Handling)" },
    { value: "single", label: "Single Quote (')" },
    { value: "double", label: 'Double Quote (")' },
  ]

  get hasPrefixAndSuffix(): boolean {
    return this.rowPrefix.trim() !== "" && this.rowSuffix.trim() !== ""
  }

  get quoteCharacter(): string {
    switch (this.selectedQuoteOption) {
      case "single":
        return "'"
      case "double":
        return '"'
      case "none":
      default:
        return ""
    }
  }
  //quote handling enabled mı değil mi
  get isQuoteHandlingEnabled(): boolean {
    return this.selectedQuoteOption !== "none"
  }

  /**
   * Handles file selection and conversion
   * @param event - File input change event
   */
  async onFileSelect(event: any): Promise<void> {
    const files = event.target.files

    if (files && files.length > 0) {
      const file = files[0]
      this.selectedFile = file

      // Detect file type
      const extension = this.getFileExtension(file.name)
      if (extension === "csv") {
        this.fileType = "csv"
      } else if (extension === "txt") {
        this.fileType = "txt"
      } else {
        this.onError.emit("Unsupported file type. Please upload a .csv or .txt file.")
        this.clearSelection()
        return
      }

      this.isProcessing = true
      try {
        let jsonResult: any

        if (this.fileType === "csv") {
          jsonResult = await this.csvService.convertFileToJson(file, this.getOptions())
        } else if (this.fileType === "txt") {
          // For TXT files, read as text and use the TXT service
          const text = await file.text()
          const txtOptions: TxtToJsonOptions = this.getTxtOptions()
          const result = this.txtService.convert(text, txtOptions)
          jsonResult = {
            properties: Object.keys(result[0] || {}),
            result: result,
          }
        }

        this.isProcessing = false
        this.onConvert.emit(jsonResult)
        this.onOptionsChange.emit(this.getOptions())
      } catch (error) {
        this.isProcessing = false
        this.onError.emit("Error reading file: " + error)
        this.clearSelection()
      }
    }
  }

  getOptions(): CsvOptions {
    return {
      hasHeader: this.hasHeader,
      skipEmptyLines: this.skipEmptyLines,
      selectedDelimiter: this.selectedDelimiter,
      doubleQuoteWrap: this.doubleQuoteWrap,
      selectedRowDelimiter: this.selectedRowDelimiter,
      rowPrefix: this.rowPrefix,
      rowSuffix: this.rowSuffix,
      selectedEncoding: this.selectedEncoding,
      selectedQuoteOption: this.selectedQuoteOption,
      trimWhitespace: this.trimWhitespace,
    }
  }

  getTxtOptions(): TxtToJsonOptions {
    return {
      fieldCount: this.fieldCount,
      startPositions: this.fieldConfigs.map((config) => config.start),
      lengths: this.fieldConfigs.map((config) => config.length),
      hasHeader: this.hasHeader,
      skipEmptyLines: this.skipEmptyLines,
    }
  }

  /**
   * Clears the selected file and resets the input
   */
  clearSelection(): void {
    this.selectedFile = null
    this.fileType = null
    this.isProcessing = false

    // Reset the file input
    const fileInput = document.getElementById("csvFileInput") as HTMLInputElement
    if (fileInput) {
      fileInput.value = ""
    }

    // Emit clear event to parent component
    this.onFileClear.emit()
  }

  /**
   * Emits the current options to parent component
   */
  private emitOptions(): void {
    const options: CsvOptions = {
      hasHeader: this.hasHeader,
      skipEmptyLines: this.skipEmptyLines,
      selectedDelimiter: this.selectedDelimiter,
      doubleQuoteWrap: this.doubleQuoteWrap,
      selectedRowDelimiter: this.selectedRowDelimiter,
      rowPrefix: this.rowPrefix,
      rowSuffix: this.rowSuffix,
      selectedEncoding: this.selectedEncoding,
      selectedQuoteOption: this.selectedQuoteOption,
      trimWhitespace: this.trimWhitespace,
    }
    this.onOptionsChange.emit(options)
  }
  // TXT-specific methods
  setFieldCount(count: number): void {
    this.fieldCount = count
    // Adjust fieldConfigs array to match the new count
    while (this.fieldConfigs.length < count) {
      const lastConfig = this.fieldConfigs[this.fieldConfigs.length - 1]
      const newStart = lastConfig ? lastConfig.start + lastConfig.length : 0
      this.fieldConfigs.push({ start: newStart, length: 10 })
    }
    while (this.fieldConfigs.length > count) {
      this.fieldConfigs.pop()
    }
    // Reset selected field index if it's out of bounds
    if (this.selectedFieldIndex >= count) {
      this.selectedFieldIndex = count - 1
    }
  }

  onFieldCountChange(): void {
    this.setFieldCount(this.fieldCount)
  }

  onFieldConfigChange(): void {
    // This method can be called when field configurations change
    // You can add any additional logic here if needed
  }

  onHeaderCheckboxChange(): void {
    this.emitOptions()
  }

  onSkipEmptyLinesChange(): void {
    this.emitOptions()
  }

  onDelimiterChange(): void {
    this.emitOptions()
  }

  onRowDelimiterChange(): void {
    this.emitOptions()
  }

  onRowPrefixChange(): void {
    this.emitOptions()
  }

  onRowSuffixChange(): void {
    this.emitOptions()
  }

  onDoubleQuoteWrapChange(): void {
    this.selectedQuoteOption = this.doubleQuoteWrap ? "double" : "none"
    this.emitOptions()
  }

  onQuoteOptionChange(): void {
    this.doubleQuoteWrap = this.selectedQuoteOption === "double"
    this.emitOptions()
  }

  onEncodingChange(): void {
    this.emitOptions()
  }

  onTrimWhitespaceChange(): void {
    this.emitOptions()
  }

  async processData(): Promise<void> {
    if (!this.selectedFile) {
      this.onError.emit("No file selected. Please select a file first.")
      return
    }

    if (this.isProcessing) {
      return
    }

    this.isProcessing = true
    console.log("Processing data with options:", this.getOptions())

    try {
      let jsonResult: any

      if (this.fileType === "csv") {
        jsonResult = await this.csvService.convertFileToJson(this.selectedFile, this.getOptions())
      } else if (this.fileType === "txt") {
        const text = await this.selectedFile.text()
        const txtOptions: TxtToJsonOptions = this.getTxtOptions()
        const result = this.txtService.convert(text, txtOptions)
        jsonResult = {
          properties: Object.keys(result[0] || {}),
          result: result,
        }
      }

      this.isProcessing = false
      console.log("Processing completed successfully:", jsonResult)
      this.onConvert.emit(jsonResult)
      this.onOptionsChange.emit(this.getOptions())
    } catch (error) {
      this.isProcessing = false
      console.error("Processing failed:", error)
      this.onError.emit("Error processing file: " + error)
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split(".").pop()?.toLowerCase() || ""
  }
}
