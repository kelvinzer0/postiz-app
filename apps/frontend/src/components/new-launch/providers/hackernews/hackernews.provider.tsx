'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { HackernewsSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hackernews.settings.dto';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';
import { Canonical } from '@gitroom/react/form/canonical';

const HackernewsSettings: FC = () => {
  const form = useSettings();
  const { date } = useIntegration();
  return (
    <>
      <Input label="Title" {...form.register('title')} />
      <Canonical
        date={date}
        label="URL (optional, for link posts)"
        {...form.register('url')}
      />
      <div>
        <label className="block text-sm font-medium mb-1">Post Type</label>
        <select
          {...form.register('postType')}
          className="w-full p-2 border rounded bg-background"
        >
          <option value="story">Story</option>
          <option value="ask">Ask HN</option>
          <option value="show">Show HN</option>
        </select>
      </div>
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: HackernewsSettings,
  CustomPreviewComponent: undefined,
  dto: HackernewsSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 20000,
});
