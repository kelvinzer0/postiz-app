'use client';

import { FC } from 'react';
import {
  PostComment,
  withProvider,
} from '@gitroom/frontend/components/new-launch/providers/high.order.provider';
import { useSettings } from '@gitroom/frontend/components/launches/helpers/use.values';
import { Input } from '@gitroom/react/form/input';
import { IndiehackersSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/indiehackers.settings.dto';
import { Canonical } from '@gitroom/react/form/canonical';
import { useIntegration } from '@gitroom/frontend/components/launches/helpers/use.integration';

const IndiehackersSettings: FC = () => {
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
    </>
  );
};

export default withProvider({
  postComment: PostComment.POST,
  minimumCharacters: [],
  SettingsComponent: IndiehackersSettings,
  CustomPreviewComponent: undefined,
  dto: IndiehackersSettingsDto,
  checkValidity: undefined,
  maximumCharacters: 100000,
});
