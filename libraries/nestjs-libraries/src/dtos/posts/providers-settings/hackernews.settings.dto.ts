import {
  IsArray,
  IsDefined,
  IsOptional,
  IsString,
  Matches,
  MinLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class HackernewsTagsSettings {
  @IsString()
  value: string;

  @IsString()
  label: string;
}

export class HackernewsSettingsDto {
  @IsString()
  @MinLength(2)
  @IsDefined()
  title: string;

  @IsOptional()
  @IsString()
  @ValidateIf((o) => o.url && o.url.indexOf('(post:') === -1)
  @Matches(
    /^(|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|www\.[a-zA-Z0-9][a-zA-Z0-9-]+[a-zA-Z0-9]\.[^\s]{2,}|https?:\/\/(?:www\.|(?!www))[a-zA-Z0-9]+\.[^\s]{2,}|www\.[a-zA-Z0-9]+\.[^\s]{2,})$/,
    {
      message: 'Invalid URL',
    }
  )
  url?: string;

  @IsString()
  @IsOptional()
  postType?: 'story' | 'ask' | 'show';

  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HackernewsTagsSettings)
  tags?: HackernewsTagsSettings[];
}
