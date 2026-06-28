using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerTrackAI_API.Migrations
{
    /// <inheritdoc />
    public partial class AddUserScopeToCompaniesAndOpportunities : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "JobOpportunities",
                type: "int",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "UserId",
                table: "Companies",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_JobOpportunities_UserId",
                table: "JobOpportunities",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_Companies_UserId",
                table: "Companies",
                column: "UserId");

            migrationBuilder.AddForeignKey(
                name: "FK_Companies_Users_UserId",
                table: "Companies",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);

            migrationBuilder.AddForeignKey(
                name: "FK_JobOpportunities_Users_UserId",
                table: "JobOpportunities",
                column: "UserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Companies_Users_UserId",
                table: "Companies");

            migrationBuilder.DropForeignKey(
                name: "FK_JobOpportunities_Users_UserId",
                table: "JobOpportunities");

            migrationBuilder.DropIndex(
                name: "IX_JobOpportunities_UserId",
                table: "JobOpportunities");

            migrationBuilder.DropIndex(
                name: "IX_Companies_UserId",
                table: "Companies");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "JobOpportunities");

            migrationBuilder.DropColumn(
                name: "UserId",
                table: "Companies");
        }
    }
}
