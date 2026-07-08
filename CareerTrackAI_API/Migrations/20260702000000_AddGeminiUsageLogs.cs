using System;
using CareerTrackAI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerTrackAI_API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260702000000_AddGeminiUsageLogs")]
    public partial class AddGeminiUsageLogs : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GeminiUsageLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    Feature = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    PromptTokens = table.Column<int>(type: "int", nullable: false),
                    OutputTokens = table.Column<int>(type: "int", nullable: false),
                    TotalTokens = table.Column<int>(type: "int", nullable: false),
                    Model = table.Column<string>(type: "nvarchar(120)", maxLength: 120, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    IsDeleted = table.Column<bool>(type: "bit", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GeminiUsageLogs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_GeminiUsageLogs_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsageLogs_Feature",
                table: "GeminiUsageLogs",
                column: "Feature");

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsageLogs_Model",
                table: "GeminiUsageLogs",
                column: "Model");

            migrationBuilder.CreateIndex(
                name: "IX_GeminiUsageLogs_UserId_CreatedAt",
                table: "GeminiUsageLogs",
                columns: new[] { "UserId", "CreatedAt" });
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GeminiUsageLogs");
        }
    }
}
