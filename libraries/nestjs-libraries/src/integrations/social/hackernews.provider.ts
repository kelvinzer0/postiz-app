import {
  AuthTokenDetails,
  PostDetails,
  PostResponse,
  SocialProvider,
} from '@gitroom/nestjs-libraries/integrations/social/social.integrations.interface';
import { SocialAbstract } from '@gitroom/nestjs-libraries/integrations/social.abstract';
import dayjs from 'dayjs';
import { Integration } from '@prisma/client';
import { makeId } from '@gitroom/nestjs-libraries/services/make.is';
import { HackernewsSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/hackernews.settings.dto';

export class HackernewsProvider extends SocialAbstract implements SocialProvider {
  override maxConcurrentJob = 3;
  identifier = 'hackernews';
  name = 'HackerNews';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = [] as string[];
  dto = HackernewsSettingsDto;
  maxLength() {
    return 20000;
  }

  async generateAuthUrl() {
    const state = makeId(6);
    return {
      url: state,
      codeVerifier: makeId(10),
      state,
    };
  }

  async refreshToken(refreshToken: string): Promise<AuthTokenDetails> {
    return {
      refreshToken: '',
      expiresIn: 0,
      accessToken: '',
      id: '',
      name: '',
      picture: '',
      username: '',
    };
  }

  async customFields() {
    return [
      {
        key: 'username',
        label: 'HackerNews Username',
        validation: `/^.{2,}$/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'HackerNews Password',
        validation: `/^.{3,}$/`,
        type: 'password' as const,
      },
    ];
  }

  async authenticate(params: {
    code: string;
    codeVerifier: string;
    refresh?: string;
  }) {
    const body = JSON.parse(Buffer.from(params.code, 'base64').toString());
    try {
      // HackerNews doesn't have a standard OAuth flow
      // We validate credentials by attempting to login via the HN API
      const loginResponse = await fetch(
        'https://news.ycombinator.com/login',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: `acct=${encodeURIComponent(body.username)}&pw=${encodeURIComponent(body.password)}`,
          redirect: 'manual',
        }
      );

      // Check if login was successful (HN redirects on success)
      if (loginResponse.status !== 302 && loginResponse.status !== 200) {
        return 'Invalid credentials';
      }

      // Get user info from Firebase API
      const userResponse = await fetch(
        `https://hacker-news.firebaseio.com/v0/user/${body.username}.json`
      );
      const userData = await userResponse.json();

      if (!userData || !userData.id) {
        return 'Invalid credentials';
      }

      return {
        refreshToken: '',
        expiresIn: dayjs().add(100, 'years').unix() - dayjs().unix(),
        accessToken: Buffer.from(
          JSON.stringify({
            username: body.username,
            password: body.password,
          })
        ).toString('base64'),
        id: userData.id,
        name: userData.id,
        picture: '',
        username: userData.id,
      };
    } catch (err) {
      return 'Invalid credentials';
    }
  }

  async post(
    id: string,
    accessToken: string,
    postDetails: PostDetails[],
    integration: Integration
  ): Promise<PostResponse[]> {
    const { settings } = postDetails?.[0] || { settings: {} };
    const creds = JSON.parse(Buffer.from(accessToken, 'base64').toString());

    try {
      // Login first to get cookie
      const loginResponse = await fetch('https://news.ycombinator.com/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `acct=${encodeURIComponent(creds.username)}&pw=${encodeURIComponent(creds.password)}`,
        redirect: 'manual',
      });

      const cookies = loginResponse.headers.get('set-cookie') || '';

      // Determine post type and construct submission
      const postType = settings?.postType || 'story';
      let submitUrl = 'https://news.ycombinator.com/submit';
      let title = settings?.title || '';

      if (postType === 'ask') {
        title = `Ask HN: ${title}`;
      } else if (postType === 'show') {
        title = `Show HN: ${title}`;
      }

      // Submit the post
      const submitBody = new URLSearchParams();
      submitBody.append('title', title);
      submitBody.append('url', settings?.url || '');
      submitBody.append('text', postDetails?.[0]?.message || '');

      const submitResponse = await fetch(submitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: cookies,
        },
        body: submitBody.toString(),
        redirect: 'manual',
      });

      if (submitResponse.status === 302) {
        const location = submitResponse.headers.get('location') || '';
        // Extract item ID from redirect URL
        const idMatch = location.match(/id=(\d+)/);
        const postId = idMatch ? idMatch[1] : makeId(6);

        return [
          {
            id: postDetails?.[0]?.id,
            status: 'completed',
            postId,
            releaseURL: `https://news.ycombinator.com/item?id=${postId}`,
          },
        ];
      }

      // If no redirect, try to find the item ID in the response
      const responseText = await submitResponse.text();
      const idMatch = responseText.match(/id=(\d+)/);
      const postId = idMatch ? idMatch[1] : makeId(6);

      return [
        {
          id: postDetails?.[0]?.id,
          status: 'completed',
          postId,
          releaseURL: `https://news.ycombinator.com/item?id=${postId}`,
        },
      ];
    } catch (err) {
      return [
        {
          id: postDetails?.[0]?.id,
          status: 'error',
          postId: '',
          releaseURL: '',
        },
      ];
    }
  }
}
