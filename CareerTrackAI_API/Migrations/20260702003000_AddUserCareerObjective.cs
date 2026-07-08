using CareerTrackAI.Data;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace CareerTrackAI_API.Migrations
{
    [DbContext(typeof(AppDbContext))]
    [Migration("20260702003000_AddUserCareerObjective")]
    public partial class AddUserCareerObjective : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "CareerObjective",
                table: "Users",
                type: "nvarchar(1000)",
                maxLength: 1000,
                nullable: true);
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CareerObjective",
                table: "Users");
        }
    }
}
