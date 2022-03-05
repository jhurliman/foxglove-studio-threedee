export const TRANSFORM_STAMPED_DATATYPES = new Set<string>();
addRosDataType(TRANSFORM_STAMPED_DATATYPES, "geometry_msgs/TransformStamped");

export const TF_DATATYPES = new Set<string>();
addRosDataType(TF_DATATYPES, "tf/tfMessage");
addRosDataType(TF_DATATYPES, "tf2_msgs/TFMessage");

// Expand a single ROS1 dataType into variations for ROS2 and protobufs,
// then add them to the given output set
function addRosDataType(output: Set<string>, dataType: string): Set<string> {
  // Add the ROS1 variation: tf2_msgs/TFMessage
  output.add(dataType);

  // Add the ROS2 variation: tf2_msgs/msg/TFMessage
  const parts = dataType.split("/");
  if (parts.length > 1) {
    const base = parts[0];
    const leaf = parts.slice(1).join("/");
    output.add(`${base}/msg/${leaf}`);
  }

  // Add the protobuf variation: ros.tf2_msgs.TFMessage
  output.add("ros." + dataType.split("/").join("."));

  return output;
}
