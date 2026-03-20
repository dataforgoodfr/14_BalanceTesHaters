import { Post } from "@/shared/model/post/Post";
import DisplayPublishedDate from "../Posts/DisplayPublishedDate";
import { SocialNetwork } from "@/shared/model/SocialNetworkName";

function PostSummary({ post }: Readonly<{ post: Post }>) {
  return (
    <div className="flex">
      {/* TODO Ajouter image pour instagram si réalisable*/}
      {post.socialNetwork === SocialNetwork.YouTube && (
        <img
          src={`https://img.youtube.com/vi/${post.postId}/0.jpg`}
          alt=""
          className="w-48 h-32 object-cover mr-4 rounded"
        />
      )}
      <div className="text-left flex flex-col items-start gap-1">
        <span className="font-semibold text-lg">{post.title}</span>
        <span className="">
          URL:{" "}
          <a href={post.url} target="_blank" rel="noopener noreferrer">
            {post.url}
          </a>
        </span>
        <DisplayPublishedDate date={post.publishedAt} />
      </div>
    </div>
  );
}

export default PostSummary;
