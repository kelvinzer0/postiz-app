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
import { IndiehackersSettingsDto } from '@gitroom/nestjs-libraries/dtos/posts/providers-settings/indiehackers.settings.dto';

export class IndiehackersProvider
  extends SocialAbstract
  implements SocialProvider
{
  override maxConcurrentJob = 3;
  identifier = 'indiehackers';
  name = 'IndieHackers';
  isBetweenSteps = false;
  editor = 'markdown' as const;
  scopes = [] as string[];
  dto = IndiehackersSettingsDto;
  maxLength() {
    return 100000;
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
        key: 'email',
        label: 'IndieHackers Email',
        validation: `/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/`,
        type: 'text' as const,
      },
      {
        key: 'password',
        label: 'IndieHackers Password',
        validation: `/^.{7,}$/`,
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
      // Authenticate via Firebase Auth REST API
      const authResponse = await fetch(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=AIzaSyB6rUw_KY1UObdN61ni2YbdBG-M45nX7bQ`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: body.email,
            password: body.password,
            returnSecureToken: true,
          }),
        }
      );

      const authData = await authResponse.json();

      if (authData.error) {
        return 'Invalid credentials';
      }

      // Get user profile from IndieHackers
      const profileResponse = await fetch(
        `https://www.indiehackers.com/api/v2/users/${authData.localId}`,
        {
          headers: {
            Authorization: `Bearer ${authData.idToken}`,
          },
        }
      );

      let username = authData.email.split('@')[0];
      let picture = '';
      let name = '';

      try {
        const profileData = await profileResponse.json();
        username = profileData.username || username;
        picture = profileData.avatarUrl || '';
        name = profileData.name || '';
      } catch {
        // Use defaults if profile fetch fails
      }

      return {
        refreshToken: authData.refreshToken || '',
        expiresIn: parseInt(authData.expiresIn) || 3600,
        accessToken: Buffer.from(
          JSON.stringify({
            idToken: authData.idToken,
            refreshToken: authData.refreshToken,
            localId: authData.localId,
          })
        ).toString('base64'),
        id: authData.localId,
        name,
        picture,
        username,
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
      // Create post via IndieHackers API (Firestore-based)
      const postId = makeId(20);
      const postBody: any = {
        title: settings?.title || '',
        body: postDetails?.[0]?.message || '',
        creatorUid: creds.localId,
        timestamp: Date.now(),
      };

      // If URL is provided, it's a link post
      if (settings?.url) {
        postBody.linkUrl = settings.url;
        postBody.postType = 'link';
      } else {
        postBody.postType = 'text';
      }

      // Use Firebase Firestore REST API to create the post
      const createResponse = await fetch(
        `https://firestore.googleapis.com/v1/projects/indie-hackers/databases/(default)/documents/posts?documentId=${postId}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${creds.idToken}`,
          },
          body: JSON.stringify({
            fields: {
              title: { stringValue: postBody.title },
              body: { stringValue: postBody.body },
              creatorUid: { stringValue: postBody.creatorUid },
              timestamp: { integerValue: String(postBody.timestamp) },
              postType: { stringValue: postBody.postType },
              ...(postBody.linkUrl
                ? { linkUrl: { stringValue: postBody.linkUrl } }
                : {}),
            },
          }),
        }
      );

      const releaseURL = `https://www.indiehackers.com/post/${postId}`;

      return [
        {
          id: postDetails?.[0]?.id,
          status: 'completed',
          postId,
          releaseURL,
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
