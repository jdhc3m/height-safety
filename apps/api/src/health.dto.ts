import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty({ enum: ['ok'], example: 'ok' })
  status!: 'ok';

  @ApiProperty({ format: 'date-time', example: '2026-08-10T00:00:00.000Z' })
  generatedAt!: string;

  @ApiProperty({
    example: null,
    nullable: true,
    required: false,
    type: String,
  })
  buildVersion?: string | null;
}
