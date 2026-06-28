using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerTrackAI_API.Migrations
{
    /// <inheritdoc />
    public partial class AddSourceProvider : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "SourceProvider",
                table: "JobOpportunities",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SourceProvider",
                table: "Companies",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobOpportunities_SourceProvider",
                table: "JobOpportunities",
                column: "SourceProvider");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_SourceProvider",
                table: "Companies",
                column: "SourceProvider");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_JobOpportunities_SourceProvider",
                table: "JobOpportunities");

            migrationBuilder.DropIndex(
                name: "IX_Companies_SourceProvider",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "SourceProvider",
                table: "JobOpportunities");

            migrationBuilder.DropColumn(
                name: "SourceProvider",
                table: "Companies");
        }
    }
}
