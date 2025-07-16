import { NgModule } from "@angular/core"
import { BrowserModule } from "@angular/platform-browser"
import { FormsModule } from "@angular/forms"
import { HttpClientModule } from "@angular/common/http"

import { AppComponent } from "./app.component"
import { FileUploaderComponent } from "./components/file-uploader/file-uploader.component"
import { DataTableComponent } from "./components/data-table/data-table.component"
import { SearchFilterPipe } from "./pipes/search-filter.pipe"
import { DashboardComponent } from "./components/dashboard/dashboard.component"
import { LoginComponent } from "./components/login/login.component"
import { RegisterComponent } from "./components/register/register.component"
import { AppRoutingModule } from "./app-routing.module"
import { TxtToJsonService } from "./services/txt-to-json.service"

@NgModule({
  declarations: [
    AppComponent,
    FileUploaderComponent,
    DataTableComponent,
    SearchFilterPipe,
    DashboardComponent,
    LoginComponent,
    RegisterComponent,
  ],
  imports: [BrowserModule, FormsModule, HttpClientModule, AppRoutingModule],
  providers: [TxtToJsonService],
  bootstrap: [AppComponent],
})
export class AppModule {}
